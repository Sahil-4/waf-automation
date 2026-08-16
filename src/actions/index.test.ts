import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatch } from './index';
import type { ActionType, Step, WafConfig } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';
import type { Page, Browser } from 'playwright';

vi.mock('./browser', () => ({
  browserOpen: vi.fn().mockResolvedValue({ browser: 'mock-browser', page: 'mock-page' }),
  browserClose: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./navigation', () => ({
  navigate: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
  goBack: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./interaction', () => ({
  click: vi.fn().mockResolvedValue(undefined),
  typeText: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  pressKey: vi.fn().mockResolvedValue(undefined),
  selectOption: vi.fn().mockResolvedValue(undefined),
  hover: vi.fn().mockResolvedValue(undefined),
  scroll: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./wait', () => ({
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  waitForNavigation: vi.fn().mockResolvedValue(undefined),
  waitForTimeout: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./read', () => ({
  scrapeText: vi.fn().mockResolvedValue(undefined),
  scrapeAttribute: vi.fn().mockResolvedValue(undefined),
  scrapeAll: vi.fn().mockResolvedValue(undefined),
  elementExists: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./context', () => ({
  storeValue: vi.fn(),
  logMessage: vi.fn(),
}));
vi.mock('./output', () => ({
  saveToFile: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./control', () => ({
  loopAction: vi.fn().mockResolvedValue(undefined),
  ifAction: vi.fn().mockResolvedValue(undefined),
  ifElseAction: vi.fn().mockResolvedValue(undefined),
  breakAction: vi.fn().mockResolvedValue(undefined),
}));

import { browserOpen, browserClose } from './browser';
import { navigate, reload, goBack } from './navigation';
import { click, typeText, clear, pressKey, selectOption, hover, scroll } from './interaction';
import { waitForSelector, waitForNavigation, waitForTimeout } from './wait';
import { scrapeText, scrapeAttribute, scrapeAll, elementExists } from './read';
import { storeValue, logMessage } from './context';
import { saveToFile, screenshot } from './output';
import { loopAction, ifAction, ifElseAction, breakAction } from './control';

const context = {} as RuntimeContext;
const page = { id: 'real-page' } as unknown as Page;
const browser = { id: 'real-browser' } as unknown as Browser;
const logger = {} as Logger;
const config = { name: 't', browser: { headless: true }, steps: [] } as WafConfig;
const executeStepsFn = vi.fn().mockResolvedValue(undefined);

function makeStep(action: ActionType, extra: Partial<Step> = {}): Step {
  return { action, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dispatch — uniform (step, context, page, browser, logger) routes', () => {
  const cases: [ActionType, ReturnType<typeof vi.fn>][] = [
    ['browser-close', browserClose as ReturnType<typeof vi.fn>],
    ['navigate', navigate as ReturnType<typeof vi.fn>],
    ['reload', reload as ReturnType<typeof vi.fn>],
    ['go-back', goBack as ReturnType<typeof vi.fn>],
    ['click', click as ReturnType<typeof vi.fn>],
    ['type', typeText as ReturnType<typeof vi.fn>],
    ['clear', clear as ReturnType<typeof vi.fn>],
    ['press-key', pressKey as ReturnType<typeof vi.fn>],
    ['select-option', selectOption as ReturnType<typeof vi.fn>],
    ['hover', hover as ReturnType<typeof vi.fn>],
    ['scroll', scroll as ReturnType<typeof vi.fn>],
    ['wait-for-selector', waitForSelector as ReturnType<typeof vi.fn>],
    ['wait-for-navigation', waitForNavigation as ReturnType<typeof vi.fn>],
    ['wait-for-timeout', waitForTimeout as ReturnType<typeof vi.fn>],
    ['scrape-text', scrapeText as ReturnType<typeof vi.fn>],
    ['scrape-attribute', scrapeAttribute as ReturnType<typeof vi.fn>],
    ['scrape-all', scrapeAll as ReturnType<typeof vi.fn>],
    ['element-exists', elementExists as ReturnType<typeof vi.fn>],
    ['store-value', storeValue as ReturnType<typeof vi.fn>],
    ['log', logMessage as ReturnType<typeof vi.fn>],
    ['save-to-file', saveToFile as ReturnType<typeof vi.fn>],
    ['screenshot', screenshot as ReturnType<typeof vi.fn>],
    ['break', breakAction as ReturnType<typeof vi.fn>],
  ];

  it.each(cases)(
    '%s routes to its handler with (step, context, page, browser, logger)',
    async (action, mockFn) => {
      const step = makeStep(action);
      const result = await dispatch(step, context, page, browser, logger, config, executeStepsFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(step, context, page, browser, logger);
      expect(result).toEqual({});
    },
  );

  it('does not call any handler other than the one routed to', async () => {
    await dispatch(makeStep('click'), context, page, browser, logger, config, executeStepsFn);
    expect(click).toHaveBeenCalledTimes(1);
    expect(hover).not.toHaveBeenCalled();
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('dispatch — browser-open (special-cased args)', () => {
  it('calls browserOpen with null, null instead of the ambient page/browser', async () => {
    const step = makeStep('browser-open');
    const result = await dispatch(step, context, page, browser, logger, config, executeStepsFn);

    expect(browserOpen).toHaveBeenCalledWith(step, context, null, null, logger, config);
    expect(result).toEqual({ browserHandle: { browser: 'mock-browser', page: 'mock-page' } });
  });
});

describe('dispatch — control-flow routes (extra executeStepsFn arg)', () => {
  it('routes "loop" to loopAction with executeStepsFn', async () => {
    const step = makeStep('loop');
    await dispatch(step, context, page, browser, logger, config, executeStepsFn);
    expect(loopAction).toHaveBeenCalledWith(step, context, page, browser, logger, executeStepsFn);
  });

  it('routes "if" to ifAction with executeStepsFn', async () => {
    const step = makeStep('if');
    await dispatch(step, context, page, browser, logger, config, executeStepsFn);
    expect(ifAction).toHaveBeenCalledWith(step, context, page, browser, logger, executeStepsFn);
  });

  it('routes "if-else" to ifElseAction with executeStepsFn', async () => {
    const step = makeStep('if-else');
    await dispatch(step, context, page, browser, logger, config, executeStepsFn);
    expect(ifElseAction).toHaveBeenCalledWith(step, context, page, browser, logger, executeStepsFn);
  });
});

describe('dispatch — unknown action', () => {
  it('throws on an action value outside the known ActionType union', async () => {
    const step = { action: 'not-a-real-action' } as unknown as Step;
    await expect(
      dispatch(step, context, page, browser, logger, config, executeStepsFn),
    ).rejects.toThrow(/Unknown action/);
  });
});
