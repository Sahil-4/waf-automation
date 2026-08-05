import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

interface FieldMapping {
  name: string;
  selector: string;
  attribute: string;
}

function resolveSelector(step: Step): string {
  const sel = step.selector ?? '';
  if (step.selectorType === 'xpath') {
    return sel.startsWith('xpath=') ? sel : `xpath=${sel}`;
  }
  return sel;
}

export async function scrapeText(
  step: Step,
  context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const target = step.target ?? '';
  logger.info(`Scraping text from "${selector}" → ctx.${target}`);
  await page.waitForSelector(selector, { timeout: 10000 });
  const text = await page.textContent(selector);
  context.set(target, text?.trim() ?? '');
}

export async function scrapeAttribute(
  step: Step,
  context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const attribute = step.argument ?? '';
  const target = step.target ?? '';
  logger.info(`Scraping attribute "${attribute}" from "${selector}" → ctx.${target}`);
  await page.waitForSelector(selector, { timeout: 10000 });
  const value = await page.getAttribute(selector, attribute);
  context.set(target, value ?? '');
}

export async function scrapeAll(
  step: Step,
  context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const target = step.target ?? '';
  const mappingJson = step.argument ?? '[]';

  let mappings: FieldMapping[];
  try {
    mappings = JSON.parse(mappingJson) as FieldMapping[];
  } catch {
    throw new Error(
      `scrape-all: argument must be a valid JSON array of field mappings, got: ${mappingJson}`,
    );
  }

  logger.info(`Scraping all "${selector}" with ${mappings.length} field mappings → ctx.${target}`);

  const elements = await page.$$(selector);
  const results: Record<string, string>[] = [];

  for (const el of elements) {
    const record: Record<string, string> = {};
    for (const mapping of mappings) {
      const childEl = await el.$(mapping.selector);
      if (!childEl) {
        record[mapping.name] = '';
        continue;
      }
      if (mapping.attribute === 'text') {
        record[mapping.name] = (await childEl.textContent())?.trim() ?? '';
      } else {
        record[mapping.name] = (await childEl.getAttribute(mapping.attribute)) ?? '';
      }
    }
    results.push(record);
  }

  context.set(target, results);
}

export async function elementExists(
  step: Step,
  context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger,
): Promise<void> {
  const selector = resolveSelector(step);
  const target = step.target ?? '';
  const el = await page.$(selector);
  const exists = el !== null;
  logger.info(`Checking element-exists "${selector}" → ${exists} → ctx.${target}`);
  context.set(target, exists);
}
