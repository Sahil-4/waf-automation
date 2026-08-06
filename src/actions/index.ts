import type { Browser, Page } from 'playwright';
import type { Step, WafConfig } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';
import type { BrowserHandle } from './browser';
import { browserOpen, browserClose } from './browser';
import { navigate, reload, goBack } from './navigation';
import { click, typeText, clear, pressKey, selectOption, hover, scroll } from './interaction';
import { waitForSelector, waitForNavigation, waitForTimeout } from './wait';
import { scrapeText, scrapeAttribute, scrapeAll, elementExists } from './read';
import { storeValue, logMessage } from './context';
import { saveToFile, screenshot } from './output';
import { loopAction, ifAction, ifElseAction, breakAction } from './control';

export type ExecuteStepsFn = (
  steps: Step[],
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
) => Promise<void>;

export interface DispatchResult {
  browserHandle?: BrowserHandle;
}

export async function dispatch(
  step: Step,
  context: RuntimeContext,
  page: Page,
  browser: Browser,
  logger: Logger,
  config: WafConfig,
  executeStepsFn: ExecuteStepsFn,
): Promise<DispatchResult> {
  switch (step.action) {
    case 'browser-open': {
      const handle = await browserOpen(step, context, null, null, logger, config);
      return { browserHandle: handle };
    }
    case 'browser-close':
      await browserClose(step, context, page, browser, logger);
      return {};

    case 'navigate':
      await navigate(step, context, page, browser, logger);
      return {};
    case 'reload':
      await reload(step, context, page, browser, logger);
      return {};
    case 'go-back':
      await goBack(step, context, page, browser, logger);
      return {};

    case 'click':
      await click(step, context, page, browser, logger);
      return {};
    case 'type':
      await typeText(step, context, page, browser, logger);
      return {};
    case 'clear':
      await clear(step, context, page, browser, logger);
      return {};
    case 'press-key':
      await pressKey(step, context, page, browser, logger);
      return {};
    case 'select-option':
      await selectOption(step, context, page, browser, logger);
      return {};
    case 'hover':
      await hover(step, context, page, browser, logger);
      return {};
    case 'scroll':
      await scroll(step, context, page, browser, logger);
      return {};

    case 'wait-for-selector':
      await waitForSelector(step, context, page, browser, logger);
      return {};
    case 'wait-for-navigation':
      await waitForNavigation(step, context, page, browser, logger);
      return {};
    case 'wait-for-timeout':
      await waitForTimeout(step, context, page, browser, logger);
      return {};

    case 'scrape-text':
      await scrapeText(step, context, page, browser, logger);
      return {};
    case 'scrape-attribute':
      await scrapeAttribute(step, context, page, browser, logger);
      return {};
    case 'scrape-all':
      await scrapeAll(step, context, page, browser, logger);
      return {};
    case 'element-exists':
      await elementExists(step, context, page, browser, logger);
      return {};

    case 'store-value':
      storeValue(step, context, page, browser, logger);
      return {};
    case 'log':
      logMessage(step, context, page, browser, logger);
      return {};

    case 'save-to-file':
      await saveToFile(step, context, page, browser, logger);
      return {};
    case 'screenshot':
      await screenshot(step, context, page, browser, logger);
      return {};

    case 'loop':
      await loopAction(step, context, page, browser, logger, executeStepsFn);
      return {};
    case 'if':
      await ifAction(step, context, page, browser, logger, executeStepsFn);
      return {};
    case 'if-else':
      await ifElseAction(step, context, page, browser, logger, executeStepsFn);
      return {};
    case 'break':
      await breakAction(step, context, page, browser, logger);
      return {};

    default: {
      const exhaustive: never = step.action;
      throw new Error(`Unknown action: ${String(exhaustive)}`);
    }
  }
}
