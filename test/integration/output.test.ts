import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { saveToFile, screenshot } from '../../src/actions/output';
import { RuntimeContext } from '../../src/context';
import { Logger } from '../../src/logger';
import type { WafConfig } from '../../src/index';

const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/sample-page.html');
const config: WafConfig = { name: 't', browser: { headless: true }, steps: [] };
const scratchDir = path.resolve(__dirname, '../tmp/output-test');

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  await fs.mkdir(scratchDir, { recursive: true });
});

afterAll(async () => {
  await browser.close();
  await fs.rm(scratchDir, { recursive: true, force: true });
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(fixtureUrl);
});

afterEach(async () => {
  await fs.rm(scratchDir, { recursive: true, force: true });
  await fs.mkdir(scratchDir, { recursive: true });
});

function makeContext(): RuntimeContext {
  return new RuntimeContext(config, new Logger());
}

describe('save-to-file', () => {
  it('writes a string context value as-is', async () => {
    const ctx = makeContext();
    ctx.set('text', 'plain string value');
    const filePath = path.join(scratchDir, 'string.txt');

    await saveToFile(
      { action: 'save-to-file', argument: filePath, target: 'text' },
      ctx,
      page,
      browser,
      new Logger(),
    );

    expect(await fs.readFile(filePath, 'utf-8')).toBe('plain string value');
  });

  it('writes an object/array context value as formatted JSON', async () => {
    const ctx = makeContext();
    ctx.set('data', [{ a: 1 }, { a: 2 }]);
    const filePath = path.join(scratchDir, 'data.json');

    await saveToFile(
      { action: 'save-to-file', argument: filePath, target: 'data' },
      ctx,
      page,
      browser,
      new Logger(),
    );

    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toBe(JSON.stringify([{ a: 1 }, { a: 2 }], null, 2));
  });

  it('auto-creates parent directories that do not exist yet', async () => {
    const ctx = makeContext();
    ctx.set('text', 'nested');
    const filePath = path.join(scratchDir, 'a', 'b', 'c', 'nested.txt');

    await saveToFile(
      { action: 'save-to-file', argument: filePath, target: 'text' },
      ctx,
      page,
      browser,
      new Logger(),
    );

    expect(await fs.readFile(filePath, 'utf-8')).toBe('nested');
  });
});

describe('screenshot', () => {
  it('writes a non-empty PNG file, auto-creating parent directories', async () => {
    const filePath = path.join(scratchDir, 'shots', 'page.png');

    await screenshot(
      { action: 'screenshot', argument: filePath },
      makeContext(),
      page,
      browser,
      new Logger(),
    );

    const stat = await fs.stat(filePath);
    expect(stat.size).toBeGreaterThan(0);
  });
});
