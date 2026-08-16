import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { browserOpen, browserClose } from '../../src/actions/browser';
import { RuntimeContext } from '../../src/context';
import { Logger } from '../../src/logger';
import type { Step, WafConfig } from '../../src/index';
import type { BrowserHandle } from '../../src/actions/browser';

const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/sample-page.html');

let handle: BrowserHandle | undefined;

afterEach(async () => {
  if (handle) {
    await handle.browser.close();
    handle = undefined;
  }
});

function makeConfig(overrides: Partial<WafConfig['browser']> = {}): WafConfig {
  return { name: 't', browser: { headless: true, ...overrides }, steps: [] };
}

function makeContext(): RuntimeContext {
  return new RuntimeContext(makeConfig(), new Logger());
}

describe('browser-open / browser-close (real chromium)', () => {
  it('launches, returns a working page and browser, and closes cleanly', async () => {
    handle = await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    expect(handle.browser.isConnected()).toBe(true);
    await browserClose(
      { action: 'browser-close' },
      makeContext(),
      handle.page,
      handle.browser,
      new Logger(),
    );
    expect(handle.browser.isConnected()).toBe(false);
    handle = undefined;
  });

  it('applies the requested viewport size', async () => {
    handle = await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ viewport: { width: 640, height: 480 } }),
    );
    expect(handle.page.viewportSize()).toEqual({ width: 640, height: 480 });
  });

  it('applies the requested userAgent', async () => {
    handle = await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig({ userAgent: 'waf-test-agent/1.0' }),
    );
    const ua = await handle.page.evaluate(() => navigator.userAgent);
    expect(ua).toBe('waf-test-agent/1.0');
  });

  it('navigates to step.argument when provided', async () => {
    const step: Step = { action: 'browser-open', argument: fixtureUrl };
    handle = await browserOpen(step, makeContext(), null, null, new Logger(), makeConfig());
    expect(await handle.page.title()).toBe('Sample Page');
  });

  it('does not navigate anywhere when no argument is provided (blank page)', async () => {
    handle = await browserOpen(
      { action: 'browser-open' },
      makeContext(),
      null,
      null,
      new Logger(),
      makeConfig(),
    );
    expect(await handle.page.title()).toBe('');
  });
});
