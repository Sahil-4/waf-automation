import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export function storeValue(
  step: Step,
  context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  logger: Logger,
): void {
  const target = step.target ?? '';
  const value = step.argument ?? '';
  logger.info(`Storing "${value}" → ctx.${target}`);
  context.set(target, value);
}

export function logMessage(
  step: Step,
  _context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  logger: Logger,
): void {
  logger.info(step.argument ?? '');
}
