import { chromium, firefox, webkit, type Browser, type Page } from 'playwright';
import type { Step, WafConfig } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export interface BrowserHandle {
  browser: Browser;
  page: Page;
}

export async function browserOpen(
  step: Step,
  context: RuntimeContext,
  _page: Page | null,
  _browser: Browser | null,
  logger: Logger,
  config: WafConfig
): Promise<BrowserHandle> {
  const engine = config.browser.engine ?? 'chromium';
  const launcher = engine === 'firefox' ? firefox : engine === 'webkit' ? webkit : chromium;

  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: config.browser.headless,
  };

  const browser = await launcher.launch(launchOptions);

  const contextOptions: Parameters<Browser['newContext']>[0] = {};
  if (config.browser.viewport) {
    contextOptions.viewport = config.browser.viewport;
  }
  if (config.browser.userAgent) {
    contextOptions.userAgent = config.browser.userAgent;
  }

  const browserContext = await browser.newContext(contextOptions);
  const page = await browserContext.newPage();

  if (step.argument) {
    logger.info(`Navigating to ${step.argument}`);
    await page.goto(step.argument, { waitUntil: 'networkidle' });
  }

  return { browser, page };
}

export async function browserClose(
  _step: Step,
  _context: RuntimeContext,
  _page: Page,
  browser: Browser,
  _logger: Logger
): Promise<void> {
  await browser.close();
}
