import { describe, it, expect, vi } from 'vitest';
import {
  evaluateCondition,
  loopAction,
  ifAction,
  ifElseAction,
  breakAction,
  BreakSignal,
} from './control';
import { executeSteps } from '../executor';
import { RuntimeContext } from '../context';
import { Logger } from '../logger';
import type { Step, WafConfig, Condition } from '../index';
import type { Page, Browser } from 'playwright';

const config: WafConfig = { name: 't', browser: { headless: true }, steps: [] };
const page = { id: 'page' } as unknown as Page;
const browser = { id: 'browser' } as unknown as Browser;

function makeContext(): RuntimeContext {
  return new RuntimeContext(config, new Logger());
}

function fakePage(exists: boolean): Page {
  return { $: vi.fn().mockResolvedValue(exists ? {} : null) } as unknown as Page;
}

describe('evaluateCondition', () => {
  it('element-exists: true when the selector is found', async () => {
    const result = await evaluateCondition(
      { type: 'element-exists', selector: '#x' },
      makeContext(),
      fakePage(true),
    );
    expect(result).toBe(true);
  });

  it('element-exists: false when the selector is not found', async () => {
    const result = await evaluateCondition(
      { type: 'element-exists', selector: '#x' },
      makeContext(),
      fakePage(false),
    );
    expect(result).toBe(false);
  });

  it('context-equals: true on a match', async () => {
    const ctx = makeContext();
    ctx.set('status', 'done');
    const result = await evaluateCondition(
      { type: 'context-equals', key: 'status', value: 'done' },
      ctx,
      page,
    );
    expect(result).toBe(true);
  });

  it('context-equals: false on a mismatch', async () => {
    const ctx = makeContext();
    ctx.set('status', 'pending');
    const result = await evaluateCondition(
      { type: 'context-equals', key: 'status', value: 'done' },
      ctx,
      page,
    );
    expect(result).toBe(false);
  });

  it('context-equals: throws on a missing key instead of silently comparing against "undefined"', async () => {
    await expect(
      evaluateCondition(
        { type: 'context-equals', key: 'missing', value: 'x' },
        makeContext(),
        page,
      ),
    ).rejects.toThrow(/references context key "missing" which has not been set/);
  });

  it('context-greater-than: true when greater', async () => {
    const ctx = makeContext();
    ctx.set('count', 10);
    const result = await evaluateCondition(
      { type: 'context-greater-than', key: 'count', value: 5 },
      ctx,
      page,
    );
    expect(result).toBe(true);
  });

  it('context-greater-than: false when not greater', async () => {
    const ctx = makeContext();
    ctx.set('count', 1);
    const result = await evaluateCondition(
      { type: 'context-greater-than', key: 'count', value: 5 },
      ctx,
      page,
    );
    expect(result).toBe(false);
  });

  it('context-greater-than: throws on a missing key instead of silently evaluating NaN', async () => {
    await expect(
      evaluateCondition(
        { type: 'context-greater-than', key: 'missing', value: -999 },
        makeContext(),
        page,
      ),
    ).rejects.toThrow(/references context key "missing" which has not been set/);
  });

  it('context-contains: true on a substring match', async () => {
    const ctx = makeContext();
    ctx.set('text', 'hello world');
    const result = await evaluateCondition(
      { type: 'context-contains', key: 'text', value: 'world' },
      ctx,
      page,
    );
    expect(result).toBe(true);
  });

  it('context-contains: false when not a substring', async () => {
    const ctx = makeContext();
    ctx.set('text', 'hello world');
    const result = await evaluateCondition(
      { type: 'context-contains', key: 'text', value: 'xyz' },
      ctx,
      page,
    );
    expect(result).toBe(false);
  });

  it('context-contains: throws on a missing key instead of silently comparing against "undefined"', async () => {
    await expect(
      evaluateCondition(
        { type: 'context-contains', key: 'missing', value: 'x' },
        makeContext(),
        page,
      ),
    ).rejects.toThrow(/references context key "missing" which has not been set/);
  });

  it('context-equals/greater-than/contains: also throws when key is omitted from the condition entirely', async () => {
    await expect(
      evaluateCondition({ type: 'context-equals', value: 'x' }, makeContext(), page),
    ).rejects.toThrow(/references context key "" which has not been set/);
  });

  it('throws on an unknown condition type', async () => {
    const bad = { type: 'not-a-real-condition' } as unknown as Condition;
    await expect(evaluateCondition(bad, makeContext(), page)).rejects.toThrow(
      /Unknown condition type/,
    );
  });
});

describe('loopAction', () => {
  it('throws if the step has no condition', async () => {
    await expect(
      loopAction({ action: 'loop' }, makeContext(), page, browser, new Logger(), vi.fn()),
    ).rejects.toThrow(/loop action requires a condition/);
  });

  it('re-evaluates the condition every iteration using a real condition + real child steps', async () => {
    const ctx = makeContext();
    ctx.set('i', 0);
    const logger = new Logger();

    const step: Step = {
      action: 'loop',
      condition: { type: 'context-greater-than', key: 'limit', value: 0 },
      steps: [{ action: 'store-value', argument: '', target: 'i' }],
    };
    // seed a decrementing counter via context-greater-than against a "limit" that
    // the child steps count down, proving each pass re-reads context rather than
    // evaluating the condition once.
    ctx.set('limit', 3);
    const countingChild: Step[] = [
      {
        action: 'store-value',
        argument: '{{ctx.limit}}',
        target: 'limitSnapshot',
      },
    ];
    let iterations = 0;
    const executeStepsFn = vi.fn(async (childSteps, childCtx: RuntimeContext) => {
      iterations += 1;
      const remaining = Number(childCtx.get('limit'));
      childCtx.set('limit', remaining - 1);
      await executeSteps(childSteps, childCtx, page, browser, logger, config);
    });

    await loopAction({ ...step, steps: countingChild }, ctx, page, browser, logger, executeStepsFn);

    expect(iterations).toBe(3);
    expect(ctx.get('limit')).toBe(0);
  });

  it('zero iterations when the condition is false from the start', async () => {
    const ctx = makeContext();
    ctx.set('limit', 0);
    const executeStepsFn = vi.fn().mockResolvedValue(undefined);

    await loopAction(
      { action: 'loop', condition: { type: 'context-greater-than', key: 'limit', value: 0 } },
      ctx,
      page,
      browser,
      new Logger(),
      executeStepsFn,
    );

    expect(executeStepsFn).not.toHaveBeenCalled();
  });

  it('catches BreakSignal from the child steps and exits the loop cleanly', async () => {
    const ctx = makeContext();
    ctx.set('limit', 5);
    const executeStepsFn = vi.fn().mockRejectedValueOnce(new BreakSignal());

    await loopAction(
      { action: 'loop', condition: { type: 'context-greater-than', key: 'limit', value: 0 } },
      ctx,
      page,
      browser,
      new Logger(),
      executeStepsFn,
    );

    expect(executeStepsFn).toHaveBeenCalledTimes(1);
  });

  it('propagates a non-BreakSignal error from the child steps', async () => {
    const ctx = makeContext();
    ctx.set('limit', 5);
    const executeStepsFn = vi.fn().mockRejectedValueOnce(new Error('real failure'));

    await expect(
      loopAction(
        { action: 'loop', condition: { type: 'context-greater-than', key: 'limit', value: 0 } },
        ctx,
        page,
        browser,
        new Logger(),
        executeStepsFn,
      ),
    ).rejects.toThrow('real failure');
  });
});

describe('ifAction', () => {
  it('throws if the step has no condition', async () => {
    await expect(
      ifAction({ action: 'if' }, makeContext(), page, browser, new Logger(), vi.fn()),
    ).rejects.toThrow(/if action requires a condition/);
  });

  it('executes steps when the condition is true', async () => {
    const executeStepsFn = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext();
    ctx.set('flag', 'yes');
    await ifAction(
      { action: 'if', condition: { type: 'context-equals', key: 'flag', value: 'yes' }, steps: [] },
      ctx,
      page,
      browser,
      new Logger(),
      executeStepsFn,
    );
    expect(executeStepsFn).toHaveBeenCalledTimes(1);
  });

  it('skips steps when the condition is false', async () => {
    const executeStepsFn = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext();
    ctx.set('flag', 'no');
    await ifAction(
      { action: 'if', condition: { type: 'context-equals', key: 'flag', value: 'yes' }, steps: [] },
      ctx,
      page,
      browser,
      new Logger(),
      executeStepsFn,
    );
    expect(executeStepsFn).not.toHaveBeenCalled();
  });
});

describe('ifElseAction', () => {
  it('throws if the step has no condition', async () => {
    await expect(
      ifElseAction({ action: 'if-else' }, makeContext(), page, browser, new Logger(), vi.fn()),
    ).rejects.toThrow(/if-else action requires a condition/);
  });

  it('executes steps (not elseSteps) when the condition is true', async () => {
    const executeStepsFn = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext();
    ctx.set('flag', 'yes');
    const step: Step = {
      action: 'if-else',
      condition: { type: 'context-equals', key: 'flag', value: 'yes' },
      steps: [{ action: 'log', label: 'then' }],
      elseSteps: [{ action: 'log', label: 'else' }],
    };
    await ifElseAction(step, ctx, page, browser, new Logger(), executeStepsFn);
    expect(executeStepsFn).toHaveBeenCalledWith(
      step.steps,
      expect.anything(),
      page,
      browser,
      expect.anything(),
    );
  });

  it('executes elseSteps (not steps) when the condition is false', async () => {
    const executeStepsFn = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext();
    ctx.set('flag', 'no');
    const step: Step = {
      action: 'if-else',
      condition: { type: 'context-equals', key: 'flag', value: 'yes' },
      steps: [{ action: 'log', label: 'then' }],
      elseSteps: [{ action: 'log', label: 'else' }],
    };
    await ifElseAction(step, ctx, page, browser, new Logger(), executeStepsFn);
    expect(executeStepsFn).toHaveBeenCalledWith(
      step.elseSteps,
      expect.anything(),
      page,
      browser,
      expect.anything(),
    );
  });
});

describe('breakAction', () => {
  it('always throws BreakSignal', () => {
    expect(() =>
      breakAction({ action: 'break' }, makeContext(), page, browser, new Logger()),
    ).toThrow(BreakSignal);
  });
});

describe('nested break — real, non-mocked loopAction calls', () => {
  it('a break in an inner loop only exits that loop, not the outer one', async () => {
    const logger = new Logger();
    const outerRuns: number[] = [];
    const innerRuns: number[] = [];

    const outerCtx = makeContext();
    outerCtx.set('outerRemaining', 3);

    let outerCount = 0;
    const outerExecuteStepsFn = async (
      _childSteps: Step[],
      c: RuntimeContext,
      p: Page,
      b: Browser,
      l: Logger,
    ): Promise<void> => {
      outerCount += 1;
      outerRuns.push(outerCount);

      // inner loop: one iteration, whose body always breaks immediately
      c.set('innerRemaining', 1);
      let innerCount = 0;
      const innerExecuteStepsFn = (): Promise<void> => {
        innerCount += 1;
        innerRuns.push(innerCount);
        throw new BreakSignal();
      };
      await loopAction(
        {
          action: 'loop',
          condition: { type: 'context-greater-than', key: 'innerRemaining', value: 0 },
        },
        c,
        p,
        b,
        l,
        innerExecuteStepsFn,
      );
    };

    await loopAction(
      {
        action: 'loop',
        condition: { type: 'context-greater-than', key: 'outerRemaining', value: 0 },
      },
      outerCtx,
      page,
      browser,
      logger,
      async (childSteps, c, p, b, l) => {
        c.set('outerRemaining', Number(c.get('outerRemaining')) - 1);
        await outerExecuteStepsFn(childSteps, c, p, b, l);
      },
    );

    // outer loop completed all 3 iterations — the inner break never escaped it
    expect(outerRuns).toEqual([1, 2, 3]);
    // each outer iteration's inner loop ran exactly once before breaking
    expect(innerRuns).toEqual([1, 1, 1]);
  });
});
