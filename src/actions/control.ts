import type { Browser, Page } from 'playwright';
import type { Step, Condition } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export class BreakSignal extends Error {
  constructor() {
    super('BreakSignal');
    this.name = 'BreakSignal';
  }
}

export async function evaluateCondition(
  condition: Condition,
  context: RuntimeContext,
  page: Page
): Promise<boolean> {
  switch (condition.type) {
    case 'element-exists': {
      const el = await page.$(condition.selector ?? '');
      return el !== null;
    }
    case 'context-equals': {
      const val = context.get(condition.key ?? '');
      return String(val) === String(condition.value ?? '');
    }
    case 'context-greater-than': {
      const val = context.get(condition.key ?? '');
      return Number(val) > Number(condition.value ?? 0);
    }
    case 'context-contains': {
      const val = context.get(condition.key ?? '');
      return String(val).includes(String(condition.value ?? ''));
    }
    default: {
      const exhaustive: never = condition.type;
      throw new Error(`Unknown condition type: ${exhaustive}`);
    }
  }
}

export async function loopAction(
  step: Step,
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
  executeSteps: (
    steps: Step[],
    context: RuntimeContext,
    page: Page,
    browser: Browser,
    logger: Logger
  ) => Promise<void>
): Promise<void> {
  if (!step.condition) {
    throw new Error('loop action requires a condition');
  }
  const childSteps = step.steps ?? [];

  while (await evaluateCondition(step.condition, context, page)) {
    try {
      await executeSteps(childSteps, context, page, browser, logger);
    } catch (err) {
      if (err instanceof BreakSignal) {
        logger.info('Loop exited via break');
        break;
      }
      throw err;
    }
  }
}

export async function ifAction(
  step: Step,
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
  executeSteps: (
    steps: Step[],
    context: RuntimeContext,
    page: Page,
    browser: Browser,
    logger: Logger
  ) => Promise<void>
): Promise<void> {
  if (!step.condition) {
    throw new Error('if action requires a condition');
  }
  const result = await evaluateCondition(step.condition, context, page);
  logger.info(`if condition evaluated to: ${result}`);
  if (result) {
    await executeSteps(step.steps ?? [], context, page, browser, logger);
  }
}

export async function ifElseAction(
  step: Step,
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
  executeSteps: (
    steps: Step[],
    context: RuntimeContext,
    page: Page,
    browser: Browser,
    logger: Logger
  ) => Promise<void>
): Promise<void> {
  if (!step.condition) {
    throw new Error('if-else action requires a condition');
  }
  const result = await evaluateCondition(step.condition, context, page);
  logger.info(`if-else condition evaluated to: ${result}`);
  if (result) {
    await executeSteps(step.steps ?? [], context, page, browser, logger);
  } else {
    await executeSteps(step.elseSteps ?? [], context, page, browser, logger);
  }
}

export async function breakAction(
  _step: Step,
  _context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  _logger: Logger
): Promise<void> {
  throw new BreakSignal();
}
