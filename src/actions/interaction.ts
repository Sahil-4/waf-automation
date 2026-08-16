import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

function resolveSelector(step: Step): string {
  const sel = step.selector ?? '';
  if (step.selectorType === 'xpath') {
    return sel.startsWith('xpath=') ? sel : `xpath=${sel}`;
  }
  return sel;
}

export async function click(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  logger.info(`Clicking "${selector}"`);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
}

export async function typeText(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const text = step.argument ?? '';
  logger.info(`Typing into "${selector}"`);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.fill(selector, text);
}

export async function clear(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  logger.info(`Clearing "${selector}"`);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.fill(selector, '');
}

export async function pressKey(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const key = step.argument ?? '';
  logger.info(`Pressing key "${key}"`);
  await page.keyboard.press(key);
}

export async function selectOption(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const value = step.argument ?? '';
  logger.info(`Selecting option "${value}" in "${selector}"`);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.selectOption(selector, value);
}

export async function hover(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  logger.info(`Hovering over "${selector}"`);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.hover(selector);
}

export async function scroll(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const arg = step.argument ?? '0';
  if (arg === 'bottom') {
    logger.info('Scrolling to bottom of page');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  } else {
    const pixels = parseInt(arg, 10);
    logger.info(`Scrolling by ${pixels}px`);
    await page.evaluate((px: number) => window.scrollBy(0, px), pixels);
  }
}
