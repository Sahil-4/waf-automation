import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export async function storeValue(
  step: Step,
  context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const target = step.target ?? '';
  const value = step.argument ?? '';
  logger.info(`Storing "${value}" → ctx.${target}`);
  context.set(target, value);
}

export async function logMessage(
  step: Step,
  _context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  logger.info(step.argument ?? '');
}
