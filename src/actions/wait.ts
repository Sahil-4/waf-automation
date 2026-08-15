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

export async function waitForSelector(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const timeout = step.timeout ?? 10000;
  logger.info(`Waiting for selector "${selector}" (timeout: ${timeout}ms)`);
  await page.waitForSelector(selector, { timeout });
}

export async function waitForNavigation(
  _step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  logger.info('Waiting for navigation (networkidle)');
  await page.waitForLoadState('networkidle');
}

export async function waitForTimeout(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const ms = parseInt(step.argument ?? '1000', 10);
  logger.info(`Waiting ${ms}ms`);
  await page.waitForTimeout(ms);
}
