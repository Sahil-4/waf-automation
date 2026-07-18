import fs from 'fs/promises';
import path from 'path';
import type { Browser, Page } from 'playwright';
import type { Step } from '../index';
import type { RuntimeContext } from '../context';
import type { Logger } from '../logger';

export async function saveToFile(
  step: Step,
  context: RuntimeContext,
  _page: Page,
  _browser: Browser,
  logger: Logger
): Promise<void> {
  const filePath = step.argument ?? '';
  const key = step.target ?? '';
  const value = context.get(key);

  const resolved = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });

  let content: string;
  if (typeof value === 'string') {
    content = value;
  } else {
    content = JSON.stringify(value, null, 2);
  }

  logger.info(`Saving ctx.${key} to "${resolved}"`);
  await fs.writeFile(resolved, content, 'utf-8');
}

export async function screenshot(
  step: Step,
  _context: RuntimeContext,
  page: Page,
  _browser: Browser,
  logger: Logger
): Promise<void> {
  const filePath = step.argument ?? 'screenshot.png';
  const resolved = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  logger.info(`Taking screenshot → "${resolved}"`);
  await page.screenshot({ path: resolved, fullPage: true });
}
