import { describe, it, expect } from 'vitest';
import { Logger } from './logger';
import type { Step } from './index';

function makeStep(overrides: Partial<Step> = {}): Step {
  return { action: 'log', ...overrides };
}

describe('Logger', () => {
  it('info() logs via console.log with the [waf] INFO prefix', () => {
    new Logger().info('hello');
    expect(console.log).toHaveBeenCalledWith('[waf] INFO  hello');
  });

  it('warn() logs via console.warn with the [waf] WARN prefix', () => {
    new Logger().warn('careful');
    expect(console.warn).toHaveBeenCalledWith('[waf] WARN  careful');
  });

  it('error() logs via console.error with the [waf] ERROR prefix', () => {
    new Logger().error('broken');
    expect(console.error).toHaveBeenCalledWith('[waf] ERROR broken');
  });

  it('stepStart() logs the step label and action', () => {
    const logger = new Logger();
    logger.stepStart(0, makeStep({ label: 'My Step', action: 'click' }));
    expect(console.log).toHaveBeenCalledWith('[waf] → [0] My Step (click)');
  });

  it('stepStart() falls back to the action name when label is unset', () => {
    const logger = new Logger();
    logger.stepStart(2, makeStep({ action: 'click' }));
    expect(console.log).toHaveBeenCalledWith('[waf] → [2] click (click)');
  });

  it('stepEnd() with status success records the entry and logs a ✓ line', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep({ label: 'Step A', action: 'click' }), 'success', 42);
    expect(logger.getLogs()).toEqual([
      {
        stepIndex: 0,
        label: 'Step A',
        action: 'click',
        status: 'success',
        durationMs: 42,
        error: undefined,
      },
    ]);
    expect(console.log).toHaveBeenCalledWith('[waf] ✓ Step A (click) 42ms');
  });

  it('stepEnd() with status failed records the error and logs via console.error', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep({ label: 'Step B' }), 'failed', 10, 'boom');
    expect(logger.getLogs()[0]).toMatchObject({ status: 'failed', error: 'boom' });
    expect(console.error).toHaveBeenCalledWith('[waf] ✗ Step B (log) — Error: boom');
  });

  it('stepEnd() with status ignored logs via console.warn', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep({ label: 'Step C' }), 'ignored', 5, 'meh');
    expect(console.warn).toHaveBeenCalledWith('[waf] ~ Step C (log) ignored — meh');
  });

  it('stepEnd() with status skipped logs via console.log', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep({ label: 'Step D' }), 'skipped', 0);
    expect(console.log).toHaveBeenCalledWith('[waf] - Step D (log) skipped');
  });

  it('getLogs() returns a copy — mutating it does not affect internal state', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep(), 'success', 1);
    const logs = logger.getLogs();
    logs.push({ stepIndex: 99, label: 'x', action: 'log', status: 'success', durationMs: 0 });
    expect(logger.getLogs()).toHaveLength(1);
  });

  it('accumulates multiple entries in order', () => {
    const logger = new Logger();
    logger.stepEnd(0, makeStep({ label: 'first' }), 'success', 1);
    logger.stepEnd(1, makeStep({ label: 'second' }), 'success', 1);
    expect(logger.getLogs().map((l) => l.label)).toEqual(['first', 'second']);
  });
});
