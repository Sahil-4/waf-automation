import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { executeSteps } from '../../src/executor';
import { RuntimeContext } from '../../src/context';
import { Logger } from '../../src/logger';
import type { Step, WafConfig } from '../../src/index';

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

describe('if — against a real element-exists condition (not mocked)', () => {
  it('runs its child steps when the selector really exists on the page', async () => {
    const ctx = makeContext();
    const steps: Step[] = [
      {
        action: 'if',
        condition: { type: 'element-exists', selector: '#exists-target' },
        steps: [{ action: 'store-value', argument: 'ran', target: 'branch' }],
      },
    ];

    await executeSteps(steps, ctx, page, browser, new Logger(), config);

    expect(ctx.get('branch')).toBe('ran');
  });

  it('skips its child steps when the selector really does not exist on the page', async () => {
    const ctx = makeContext();
    const steps: Step[] = [
      {
        action: 'if',
        condition: { type: 'element-exists', selector: '#does-not-exist' },
        steps: [{ action: 'store-value', argument: 'ran', target: 'branch' }],
      },
    ];

    await executeSteps(steps, ctx, page, browser, new Logger(), config);

    expect(ctx.get('branch')).toBeUndefined();
  });
});

describe('loop — with break, against a real element-exists condition', () => {
  it('runs its body exactly once when the loop condition is true and the body immediately breaks', async () => {
    const ctx = makeContext();
    const steps: Step[] = [
      {
        action: 'loop',
        condition: { type: 'element-exists', selector: '#exists-target' },
        steps: [
          { action: 'store-value', argument: 'ran', target: 'iterations' },
          { action: 'break' },
        ],
      },
    ];

    await executeSteps(steps, ctx, page, browser, new Logger(), config);

    expect(ctx.get('iterations')).toBe('ran');
  });
});
