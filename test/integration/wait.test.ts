import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { waitForSelector, waitForTimeout } from '../../src/actions/wait';
import { RuntimeContext } from '../../src/context';
import { Logger } from '../../src/logger';
import type { WafConfig } from '../../src/index';

const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/sample-page.html');
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
  await page.goto(fixtureUrl);
});

function makeContext(): RuntimeContext {
  return new RuntimeContext(config, new Logger());
}

describe('wait-for-selector', () => {
  it('resolves immediately for an element already present', async () => {
    await expect(
      waitForSelector(
        { action: 'wait-for-selector', selector: '#heading' },
        makeContext(),
        page,
        browser,
        new Logger(),
      ),
    ).resolves.toBeUndefined();
  });

  it('waits for an element that appears after a delay, within a generous timeout', async () => {
    await expect(
      waitForSelector(
        { action: 'wait-for-selector', selector: '#delayed-target', timeout: 5000 },
        makeContext(),
        page,
        browser,
        new Logger(),
      ),
    ).resolves.toBeUndefined();
  });

  it('times out if the element appears later than the given timeout', async () => {
    await expect(
      waitForSelector(
        { action: 'wait-for-selector', selector: '#delayed-target', timeout: 100 },
        makeContext(),
        page,
        browser,
        new Logger(),
      ),
    ).rejects.toThrow();
  });

  it('times out for a selector that never appears at all', async () => {
    await expect(
      waitForSelector(
        { action: 'wait-for-selector', selector: '#never-exists', timeout: 200 },
        makeContext(),
        page,
        browser,
        new Logger(),
      ),
    ).rejects.toThrow();
  });
});

describe('wait-for-timeout', () => {
  it('waits approximately the requested duration', async () => {
    const start = Date.now();
    await waitForTimeout(
      { action: 'wait-for-timeout', argument: '300' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(280);
  });
});
