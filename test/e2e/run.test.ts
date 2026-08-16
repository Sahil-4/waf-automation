import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { run } from '../../src/index';

const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/sample-page.html');

let scratchDir: string;

beforeAll(async () => {
  scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'waf-e2e-'));
});

afterAll(async () => {
  await fs.rm(scratchDir, { recursive: true, force: true });
});

describe('run() — full pipeline, mirroring configs/example.yaml against the local fixture', () => {
  it('loads a real YAML file from disk, scrapes, stores, saves to file, screenshots, and reports success', async () => {
    const configPath = path.join(scratchDir, 'e2e.yaml');
    const outputDir = path.join(scratchDir, 'output');
    const itemsPath = path.join(outputDir, 'items.json');
    const screenshotPath = path.join(outputDir, 'screenshot.png');

    const yaml = `
name: E2E Fixture Scrape
description: Mirrors configs/example.yaml against the local test fixture instead of the live internet.

browser:
  headless: true

variables:
  outputDir: ${outputDir}

steps:
  - action: browser-open
    label: Open fixture page
    argument: "${fixtureUrl}"

  - action: wait-for-selector
    label: Wait for item list
    selector: .item

  - action: scrape-all
    label: Scrape all items
    selector: .item
    argument: '[{"name":"title","selector":".title","attribute":"text"},{"name":"link","selector":".link","attribute":"href"}]'
    target: items

  - action: store-value
    label: Record page number
    argument: "1"
    target: pageCounter

  - action: log
    label: Log progress
    argument: "Scraped page {{ctx.pageCounter}} — found items"

  - action: save-to-file
    label: Save items to JSON
    argument: "${itemsPath}"
    target: items

  - action: screenshot
    label: Capture page screenshot
    argument: "${screenshotPath}"

  - action: browser-close
    label: Close browser
`;

    await fs.writeFile(configPath, yaml, 'utf-8');

    const result = await run({ config: configPath });

    expect(result.status).toBe('success');
    expect(result.failedStep).toBeNull();

    expect(result.context.items).toEqual([
      { title: 'First Item', link: '/items/1' },
      { title: 'Second Item', link: '/items/2' },
      { title: 'Third Item', link: '/items/3' },
      { title: 'Fourth Item (no link)', link: '' },
    ]);
    expect(result.context.pageCounter).toBe('1');

    const savedItems: unknown = JSON.parse(await fs.readFile(itemsPath, 'utf-8'));
    expect(savedItems).toEqual(result.context.items);

    const screenshotStat = await fs.stat(screenshotPath);
    expect(screenshotStat.size).toBeGreaterThan(0);

    expect(result.log).toHaveLength(8);
    expect(result.log.every((entry) => entry.status === 'success')).toBe(true);
  });
});
