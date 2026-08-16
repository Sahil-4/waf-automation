import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import {
  click,
  typeText,
  clear,
  pressKey,
  selectOption,
  hover,
  scroll,
} from '../../src/actions/interaction';
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

describe('click', () => {
  it('clicks the target and triggers its onclick handler', async () => {
    await click(
      { action: 'click', selector: '#click-target' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.textContent('#click-result')).toBe('clicked');
  });

  it('accepts an xpath selector without an explicit xpath= prefix', async () => {
    await click(
      { action: 'click', selector: '//button[@id="click-target"]', selectorType: 'xpath' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.textContent('#click-result')).toBe('clicked');
  });

  it('accepts an xpath selector that is already prefixed with xpath=', async () => {
    await click(
      { action: 'click', selector: 'xpath=//button[@id="click-target"]', selectorType: 'xpath' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.textContent('#click-result')).toBe('clicked');
  });
});

describe('type', () => {
  it('fills the target input with the argument', async () => {
    await typeText(
      { action: 'type', selector: '#text-input', argument: 'hello world' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.inputValue('#text-input')).toBe('hello world');
  });
});

describe('clear', () => {
  it('empties a pre-filled input', async () => {
    expect(await page.inputValue('#prefilled-input')).toBe('prefilled text');
    await clear(
      { action: 'clear', selector: '#prefilled-input' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.inputValue('#prefilled-input')).toBe('');
  });
});

describe('press-key', () => {
  it('sends the key to whatever currently has focus', async () => {
    await page.focus('#key-target');
    await pressKey(
      { action: 'press-key', argument: 'a' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.inputValue('#key-target')).toBe('a');
  });
});

describe('select-option', () => {
  it('selects the option by value', async () => {
    await selectOption(
      { action: 'select-option', selector: '#dropdown', argument: 'b' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(await page.$eval('#dropdown', (el: HTMLSelectElement) => el.value)).toBe('b');
  });

  it('explicitly waits for the selector before acting, matching click/type/clear', async () => {
    // Note: Playwright's own action methods already auto-wait for actionability,
    // so an outcome-only test (does it succeed against a delayed element?) can't
    // distinguish before/after this fix — verified empirically that page.hover()
    // succeeds against a 300ms-delayed element with zero explicit wait at all.
    // Spy on the actual call instead, to verify the explicit pre-wait genuinely happens.
    const waitSpy = vi.spyOn(page, 'waitForSelector');
    await selectOption(
      { action: 'select-option', selector: '#dropdown', argument: 'b' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(waitSpy).toHaveBeenCalledWith('#dropdown', { timeout: 10000 });
  });
});

describe('hover', () => {
  it('triggers the mouseenter handler on the target', async () => {
    await hover(
      { action: 'hover', selector: '#hover-target' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    const classAttr = await page.getAttribute('#hover-target', 'class');
    expect(classAttr).toContain('hovered');
  });

  it('explicitly waits for the selector before acting, matching click/type/clear', async () => {
    const waitSpy = vi.spyOn(page, 'waitForSelector');
    await hover(
      { action: 'hover', selector: '#hover-target' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    expect(waitSpy).toHaveBeenCalledWith('#hover-target', { timeout: 10000 });
  });
});

describe('scroll', () => {
  it('scrolls to the bottom of the page', async () => {
    const before = await page.evaluate(() => window.scrollY);
    await scroll(
      { action: 'scroll', argument: 'bottom' },
      makeContext(),
      page,
      browser,
      new Logger(),
    );
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeGreaterThan(before);
  });

  it('scrolls by a specific pixel amount', async () => {
    const before = await page.evaluate(() => window.scrollY);
    await scroll({ action: 'scroll', argument: '250' }, makeContext(), page, browser, new Logger());
    const after = await page.evaluate(() => window.scrollY);
    expect(after - before).toBeCloseTo(250, 0);
  });
});
