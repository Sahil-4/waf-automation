import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { scrapeText, scrapeAttribute, scrapeAll, elementExists } from '../../src/actions/read';
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

describe('scrape-text', () => {
  it('stores the trimmed text content at the target key', async () => {
    const ctx = makeContext();
    await scrapeText(
      { action: 'scrape-text', selector: '#heading', target: 'heading' },
      ctx,
      page,
      browser,
      new Logger(),
    );
    expect(ctx.get('heading')).toBe('Sample Page');
  });
});

describe('scrape-attribute', () => {
  it('stores the named attribute value at the target key', async () => {
    const ctx = makeContext();
    await scrapeAttribute(
      { action: 'scrape-attribute', selector: '#attr-target', argument: 'data-foo', target: 'foo' },
      ctx,
      page,
      browser,
      new Logger(),
    );
    expect(ctx.get('foo')).toBe('bar');
  });
});

describe('scrape-all', () => {
  it('maps every matching element via the field mappings, defaulting missing children to an empty string', async () => {
    const ctx = makeContext();
    const mapping = JSON.stringify([
      { name: 'title', selector: '.title', attribute: 'text' },
      { name: 'link', selector: '.link', attribute: 'href' },
    ]);
    await scrapeAll(
      { action: 'scrape-all', selector: '.item', argument: mapping, target: 'items' },
      ctx,
      page,
      browser,
      new Logger(),
    );
    expect(ctx.get('items')).toEqual([
      { title: 'First Item', link: '/items/1' },
      { title: 'Second Item', link: '/items/2' },
      { title: 'Third Item', link: '/items/3' },
      { title: 'Fourth Item (no link)', link: '' },
    ]);
  });

  it('throws a descriptive error for invalid mapping JSON', async () => {
    await expect(
      scrapeAll(
        { action: 'scrape-all', selector: '.item', argument: 'not json', target: 'items' },
        makeContext(),
        page,
        browser,
        new Logger(),
      ),
    ).rejects.toThrow(/scrape-all: argument must be a valid JSON array/);
  });
});

describe('element-exists', () => {
  it('stores true when the selector matches', async () => {
    const ctx = makeContext();
    await elementExists(
      { action: 'element-exists', selector: '#exists-target', target: 'found' },
      ctx,
      page,
      browser,
      new Logger(),
    );
    expect(ctx.get('found')).toBe(true);
  });

  it('stores false when the selector does not match', async () => {
    const ctx = makeContext();
    await elementExists(
      { action: 'element-exists', selector: '#does-not-exist', target: 'found' },
      ctx,
      page,
      browser,
      new Logger(),
    );
    expect(ctx.get('found')).toBe(false);
  });
});
