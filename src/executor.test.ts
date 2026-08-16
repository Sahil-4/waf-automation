import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSteps } from './executor';
import { RuntimeContext } from './context';
import { Logger } from './logger';
import { BreakSignal } from './actions/control';
import type { Step, WafConfig } from './index';
import type { Page, Browser } from 'playwright';

vi.mock('./actions/index', () => ({
  dispatch: vi.fn().mockResolvedValue({}),
}));

import { dispatch } from './actions/index';

const config: WafConfig = { name: 't', browser: { headless: true }, steps: [] };
const page = { id: 'page' } as unknown as Page;
const browser = { id: 'browser' } as unknown as Browser;

function makeContext(variables?: Record<string, string>): RuntimeContext {
  return new RuntimeContext({ ...config, variables }, new Logger());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dispatch).mockResolvedValue({});
});

describe('executeSteps — interpolation before dispatch', () => {
  it('interpolates selector/argument/target with real values before calling dispatch', async () => {
    const context = makeContext({ sel: '#target', val: 'hello', dest: 'out' });
    const logger = new Logger();
    const steps: Step[] = [
      { action: 'click', selector: '{{ctx.sel}}', argument: '{{ctx.val}}', target: '{{ctx.dest}}' },
    ];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ selector: '#target', argument: 'hello', target: 'out' }),
      context,
      page,
      browser,
      logger,
      config,
      expect.any(Function),
    );
  });

  it('interpolates condition.selector/key and a string condition.value', async () => {
    const context = makeContext({ sel: '#x', key: 'count', val: '5' });
    const logger = new Logger();
    const steps: Step[] = [
      {
        action: 'if',
        condition: {
          type: 'element-exists',
          selector: '{{ctx.sel}}',
          key: '{{ctx.key}}',
          value: '{{ctx.val}}',
        },
      },
    ];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: expect.objectContaining({ selector: '#x', key: 'count', value: '5' }),
      }),
      context,
      page,
      browser,
      logger,
      config,
      expect.any(Function),
    );
  });

  it('leaves a numeric condition.value untouched (not run through interpolate)', async () => {
    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [
      { action: 'if', condition: { type: 'context-greater-than', key: 'x', value: 42 } },
    ];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ condition: expect.objectContaining({ value: 42 }) }),
      context,
      page,
      browser,
      logger,
      config,
      expect.any(Function),
    );
  });
});

describe('executeSteps — onError handling', () => {
  it('onError unset (default fail): logs failed and rethrows, stopping the run', async () => {
    vi.mocked(dispatch).mockRejectedValueOnce(new Error('boom'));
    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [{ action: 'click' }];

    await expect(executeSteps(steps, context, page, browser, logger, config)).rejects.toThrow(
      'boom',
    );
    expect(logger.getLogs()).toEqual([
      expect.objectContaining({ status: 'failed', error: 'boom' }),
    ]);
  });

  it('onError ignore: logs ignored and continues to the next step', async () => {
    vi.mocked(dispatch).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [{ action: 'click', onError: 'ignore' }, { action: 'click' }];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(logger.getLogs().map((l) => l.status)).toEqual(['ignored', 'success']);
  });

  it('BreakSignal is always rethrown, even with onError: ignore', async () => {
    vi.mocked(dispatch).mockRejectedValueOnce(new BreakSignal());
    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [{ action: 'break', onError: 'ignore' }];

    await expect(
      executeSteps(steps, context, page, browser, logger, config),
    ).rejects.toBeInstanceOf(BreakSignal);
  });
});

describe('executeSteps — logging guarantees', () => {
  it('records a log entry for every attempted step, even one that fails during interpolation itself', async () => {
    const context = makeContext();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    context.set('bad', circular);
    const logger = new Logger();
    const steps: Step[] = [{ action: 'log', argument: 'references {{ctx.bad}}' }];

    await expect(executeSteps(steps, context, page, browser, logger, config)).rejects.toThrow();

    expect(logger.getLogs()).toHaveLength(1);
    expect(logger.getLogs()[0]).toMatchObject({ status: 'failed' });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('executeSteps — browser handle propagation', () => {
  it("updates page/browser for later sibling steps after a browser-open step's handle", async () => {
    const newPage = { id: 'new-page' } as unknown as Page;
    const newBrowser = { id: 'new-browser' } as unknown as Browser;
    vi.mocked(dispatch)
      .mockResolvedValueOnce({ browserHandle: { browser: newBrowser, page: newPage } })
      .mockResolvedValueOnce({});

    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [{ action: 'browser-open' }, { action: 'click' }];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      context,
      newPage,
      newBrowser,
      logger,
      config,
      expect.any(Function),
    );
  });

  it('does not propagate a handle opened inside a loop/if child block back to the parent level', async () => {
    const childPage = { id: 'child-page' } as unknown as Page;
    const childBrowser = { id: 'child-browser' } as unknown as Browser;

    // simulate: dispatching the "if" step recurses into executeSteps via the
    // executeStepsFn callback, which itself dispatches a browser-open — but the
    // wrapper in executor.ts discards that inner result, so the OUTER call after
    // the if-block should still see the original page/browser.
    vi.mocked(dispatch).mockImplementation(async (step, ctx, pg, br, log, cfg, executeStepsFn) => {
      if (step.action === 'if') {
        await executeStepsFn([{ action: 'browser-open' }], ctx, pg, br, log);
        return {};
      }
      if (step.action === 'browser-open') {
        return { browserHandle: { browser: childBrowser, page: childPage } };
      }
      return {};
    });

    const context = makeContext();
    const logger = new Logger();
    const steps: Step[] = [{ action: 'if' }, { action: 'click' }];

    await executeSteps(steps, context, page, browser, logger, config);

    expect(dispatch).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      context,
      page,
      browser,
      logger,
      config,
      expect.any(Function),
    );
  });
});
