import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { navigate, reload, goBack } from '../../src/actions/navigation';
import { waitForNavigation } from '../../src/actions/wait';
import { RuntimeContext } from '../../src/context';
import { Logger } from '../../src/logger';
import type { WafConfig } from '../../src/index';

const sampleUrl = 'file://' + path.resolve(__dirname, '../fixtures/sample-page.html');
const pageTwoUrl = 'file://' + path.resolve(__dirname, '../fixtures/page-two.html');

const config: WafConfig = { name: 't', browser: { headless: true }, steps: [] };

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(sampleUrl);
});

function makeContext(): RuntimeContext {
  return new RuntimeContext(config, new Logger());
}

describe('navigate', () => {
  it('navigates to the given URL', async () => {
    await navigate(
      { action: 'navigate', argument: pageTwoUrl },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.title()).toBe('Page Two');
  });
});

describe('reload', () => {
  it('resets in-page state (a filled input goes back to its original value)', async () => {
    await page.fill('#text-input', 'typed before reload');
    expect(await page.inputValue('#text-input')).toBe('typed before reload');

    await reload({ action: 'reload' }, makeContext(), page, browser, new Logger());

    expect(await page.inputValue('#text-input')).toBe('');
  });
});

describe('go-back', () => {
  it('returns to the previous page in history', async () => {
    await page.goto(pageTwoUrl);
    expect(await page.title()).toBe('Page Two');

    await goBack({ action: 'go-back' }, makeContext(), page, browser, new Logger());

    expect(await page.title()).toBe('Sample Page');
  });
});

describe('wait-for-navigation', () => {
  it('actually waits for in-flight network activity to settle, not just fires instantly', async () => {
    // fetch()/relative-path resource loads are blocked outright on file:// origins
    // before Playwright's routing ever sees them (verified separately) — a
    // cross-origin <img> tag is a real network request Playwright can intercept
    // and delay, regardless of the page's own file:// origin.
    let resolveRoute: () => void = () => undefined;
    const routeDelay = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    await page.route('**://waf-test.invalid/**', async (route) => {
      await routeDelay;
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') });
    });

    await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'https://waf-test.invalid/delayed.png';
      document.body.appendChild(img);
    });

    setTimeout(resolveRoute, 300);

    const start = Date.now();
    await waitForNavigation(
      { action: 'wait-for-navigation' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(600);
  });
});
