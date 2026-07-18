import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { WafConfig } from './index';

export async function loadConfig(filePath: string): Promise<WafConfig> {
  const resolved = path.resolve(filePath);
  let raw: string;

  try {
    raw = await fs.readFile(resolved, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read config file "${resolved}": ${(err as Error).message}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  let parsed: unknown;

  if (ext === '.yaml' || ext === '.yml') {
    try {
      parsed = yaml.load(raw);
    } catch (err) {
      throw new Error(`YAML parse error in "${resolved}": ${(err as Error).message}`);
    }
  } else if (ext === '.json') {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`JSON parse error in "${resolved}": ${(err as Error).message}`);
    }
  } else {
    throw new Error(`Unsupported config format "${ext}". Use .yaml, .yml, or .json`);
  }

  return validateConfig(parsed, resolved);
}

function validateConfig(raw: unknown, filePath: string): WafConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Config in "${filePath}" must be a YAML/JSON object at the top level`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '') {
    throw new Error(`Config "${filePath}" is missing required field: name (string)`);
  }

  if (typeof obj['browser'] !== 'object' || obj['browser'] === null || Array.isArray(obj['browser'])) {
    throw new Error(`Config "${filePath}" is missing required field: browser (object)`);
  }

  const browser = obj['browser'] as Record<string, unknown>;

  if (typeof browser['headless'] !== 'boolean') {
    throw new Error(`Config "${filePath}": browser.headless must be a boolean`);
  }

  if (
    browser['engine'] !== undefined &&
    !['chromium', 'firefox', 'webkit'].includes(browser['engine'] as string)
  ) {
    throw new Error(
      `Config "${filePath}": browser.engine must be one of: chromium, firefox, webkit`
    );
  }

  if (!Array.isArray(obj['steps']) || obj['steps'].length === 0) {
    throw new Error(`Config "${filePath}" is missing required field: steps (non-empty array)`);
  }

  return obj as unknown as WafConfig;
}
