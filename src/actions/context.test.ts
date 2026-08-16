import { describe, it, expect, vi } from 'vitest';
import { storeValue, logMessage } from './context';
import { RuntimeContext } from '../context';
import { Logger } from '../logger';
import type { Step } from '../index';
import type { Browser, Page } from 'playwright';

function makeContext(): RuntimeContext {
  return new RuntimeContext({ name: 't', browser: { headless: true }, steps: [] }, new Logger());
}

const fakePage = null as unknown as Page;
const fakeBrowser = null as unknown as Browser;

describe('storeValue', () => {
  it('writes the interpolated argument to the target context key', () => {
    const ctx = makeContext();
    const step: Step = { action: 'store-value', argument: 'hello', target: 'greeting' };
    storeValue(step, ctx, fakePage, fakeBrowser, new Logger());
    expect(ctx.get('greeting')).toBe('hello');
  });

  it('writes an empty string when argument is missing', () => {
    const ctx = makeContext();
    const step: Step = { action: 'store-value', target: 'greeting' };
    storeValue(step, ctx, fakePage, fakeBrowser, new Logger());
    expect(ctx.get('greeting')).toBe('');
  });

  it('writes to the empty-string key when target is missing, without throwing', () => {
    const ctx = makeContext();
    const step: Step = { action: 'store-value', argument: 'value' };
    expect(() => storeValue(step, ctx, fakePage, fakeBrowser, new Logger())).not.toThrow();
    expect(ctx.get('')).toBe('value');
  });
});

describe('logMessage', () => {
  it('logs the step argument via logger.info', () => {
    const logger = new Logger();
    const infoSpy = vi.spyOn(logger, 'info');
    const step: Step = { action: 'log', argument: 'hello world' };
    logMessage(step, makeContext(), fakePage, fakeBrowser, logger);
    expect(infoSpy).toHaveBeenCalledWith('hello world');
  });

  it('logs an empty string when argument is missing', () => {
    const logger = new Logger();
    const infoSpy = vi.spyOn(logger, 'info');
    const step: Step = { action: 'log' };
    logMessage(step, makeContext(), fakePage, fakeBrowser, logger);
    expect(infoSpy).toHaveBeenCalledWith('');
  });
});
