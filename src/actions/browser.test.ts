import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromium, firefox, webkit } from 'playwright';
import type { Page } from 'playwright';
import { browserOpen, browserClose } from './browser';
import { RuntimeContext } from '../context';
import { Logger } from '../logger';
import type { Step, WafConfig } from '../index';

vi.mock('playwright', () => {
  const mockPage = { goto: vi.fn().mockResolvedValue(undefined) };
  const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage) };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    chromium: { launch: vi.fn().mockResolvedValue(mockBrowser) },
    firefox: { launch: vi.fn().mockResolvedValue(mockBrowser) },
    webkit: { launch: vi.fn().mockResolvedValue(mockBrowser) },
  };
});

function makeConfig(overrides: Partial<WafConfig['browser']> = {}): WafConfig {
  return {
    name: 't',
    browser: { headless: true, ...overrides },
    steps: [],
  };
}

function makeContext(): RuntimeContext {
  return new RuntimeContext(makeConfig(), new Logger());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('browserOpen — engine selection', () => {
  it('defaults to chromium when engine is unset', async () => {
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(firefox.launch).not.toHaveBeenCalled();
    expect(webkit.launch).not.toHaveBeenCalled();
  });

  it('uses firefox when engine is "firefox"', async () => {
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ engine: 'firefox' }),
    );
    expect(firefox.launch).toHaveBeenCalledTimes(1);
    expect(chromium.launch).not.toHaveBeenCalled();
  });

  it('uses webkit when engine is "webkit"', async () => {
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ engine: 'webkit' }),
    );
    expect(webkit.launch).toHaveBeenCalledTimes(1);
    expect(chromium.launch).not.toHaveBeenCalled();
  });
});

describe('browserOpen — launch options', () => {
  it('passes headless through to launch()', async () => {
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ headless: false }),
    );
    expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
  });

  it('includes viewport in newContext options only when provided', async () => {
    const browser = await chromium.launch();
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ viewport: { width: 800, height: 600 } }),
    );
    expect(browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ viewport: { width: 800, height: 600 } }),
    );
  });

  it('omits viewport from newContext options when not provided', async () => {
    const browser = await chromium.launch();
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    const callArgs = vi.mocked(browser.newContext).mock.calls.at(-1)?.[0];
    expect(callArgs).not.toHaveProperty('viewport');
  });

  it('includes userAgent in newContext options only when provided', async () => {
    const browser = await chromium.launch();
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ userAgent: 'test-agent' }),
    );
    expect(browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'test-agent' }),
    );
  });

  it('omits userAgent from newContext options when not provided', async () => {
    const browser = await chromium.launch();
    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    const callArgs = vi.mocked(browser.newContext).mock.calls.at(-1)?.[0];
    expect(callArgs).not.toHaveProperty('userAgent');
  });
});

describe('browserOpen — initial navigation', () => {
  it('navigates to step.argument when provided', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const step: Step = { action: 'browser-open', argument: 'https://example.com' };
    await browserOpen(step, makeContext(), null, null, new Logger(), makeConfig());

    expect(page.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle' });
  });

  it('does not navigate when no argument is provided', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );

    expect(page.goto).not.toHaveBeenCalled();
  });

  it('returns the browser and page handle', async () => {
    const handle = await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    expect(handle).toHaveProperty('browser');
    expect(handle).toHaveProperty('page');
  });
});

describe('browserClose', () => {
  it('closes the browser', async () => {
    const browser = await chromium.launch();
    await browserClose(
      { action: 'browser-close' },
      makeContext(),
      null as unknown as Page,
      browser,
      new Logger(),
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
