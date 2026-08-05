import type { Browser, Page } from 'playwright';
import type { Step, WafConfig } from './index';
import type { RuntimeContext } from './context';
import type { Logger } from './logger';
import { dispatch } from './actions/index';
import { BreakSignal } from './actions/control';

function interpolateStep(step: Step, context: RuntimeContext): Step {
  const interpolate = (v: string | undefined): string | undefined =>
    v !== undefined ? context.interpolate(v) : undefined;

  const interpolated: Step = {
    ...step,
    selector: interpolate(step.selector),
    argument: interpolate(step.argument),
    target: interpolate(step.target),
  };

  if (step.condition) {
    interpolated.condition = {
      ...step.condition,
      selector: interpolate(step.condition.selector),
      key: interpolate(step.condition.key),
      value:
        typeof step.condition.value === 'string'
          ? interpolate(step.condition.value)
          : step.condition.value,
    };
  }

  return interpolated;
}

export async function executeSteps(
  steps: Step[],
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
  config: WafConfig,
): Promise<{ page: Page; browser: Browser }> {
  let currentPage = page;
  let currentBrowser = browser;

  for (let i = 0; i < steps.length; i++) {
    const raw = steps[i];
    const step = interpolateStep(raw, context);
    const startMs = Date.now();

    logger.stepStart(i, step);

    try {
      const result = await dispatch(
        step,
        context,
        currentPage,
        currentBrowser,
        logger,
        config,
        (childSteps, ctx, pg, br, log) =>
          executeSteps(childSteps, ctx, pg, br, log, config).then(() => undefined),
      );

      if (result.browserHandle) {
        currentBrowser = result.browserHandle.browser;
        currentPage = result.browserHandle.page;
      }

      logger.stepEnd(i, step, 'success', Date.now() - startMs);
    } catch (err) {
      const durationMs = Date.now() - startMs;

      if (err instanceof BreakSignal) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);

      if (step.onError === 'ignore') {
        logger.stepEnd(i, step, 'ignored', durationMs, message);
      } else {
        logger.stepEnd(i, step, 'failed', durationMs, message);
        throw err;
      }
    }
  }

  return { page: currentPage, browser: currentBrowser };
}
