import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export async function navigate(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger
): Promise<void> {
  const url = step.argument ?? '';
  logger.info(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
}

export async function reload(
  _step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger
): Promise<void> {
  logger.info('Reloading page');
  await page.reload({ waitUntil: 'networkidle' });
}

export async function goBack(
  _step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger
): Promise<void> {
  logger.info('Going back');
  await page.goBack({ waitUntil: 'networkidle' });
}
