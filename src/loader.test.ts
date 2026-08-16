import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { loadConfig } from './loader';

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'waf-loader-test-'));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeFixture(name: string, content: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

const validYaml = `
name: Test Config
browser:
  headless: true
steps:
  - action: log
    argument: hi
`;

const validJson = JSON.stringify({
  name: 'Test Config',
  browser: { headless: true },
  steps: [{ action: 'log', argument: 'hi' }],
});

describe('loadConfig', () => {
  it('parses a valid .yaml file', async () => {
    const filePath = await writeFixture('valid.yaml', validYaml);
    const config = await loadConfig(filePath);
    expect(config.name).toBe('Test Config');
    expect(config.browser.headless).toBe(true);
    expect(config.steps).toHaveLength(1);
  });

  it('parses a valid .yml file', async () => {
    const filePath = await writeFixture('valid.yml', validYaml);
    const config = await loadConfig(filePath);
    expect(config.name).toBe('Test Config');
  });

  it('parses a valid .json file', async () => {
    const filePath = await writeFixture('valid.json', validJson);
    const config = await loadConfig(filePath);
    expect(config.name).toBe('Test Config');
    expect(config.steps).toHaveLength(1);
  });

  it('rejects an unsupported extension', async () => {
    const filePath = await writeFixture('config.txt', validYaml);
    await expect(loadConfig(filePath)).rejects.toThrow(/Unsupported config format/);
  });

  it('rejects a nonexistent file, with the original error as cause', async () => {
    const filePath = path.join(tmpDir, 'does-not-exist.yaml');
    await expect(loadConfig(filePath)).rejects.toMatchObject({
      cause: expect.objectContaining({ code: 'ENOENT' }),
    });
  });

  it('rejects malformed YAML, with the original error as cause', async () => {
    const filePath = await writeFixture('bad.yaml', 'name: [unterminated');
    let caught: unknown;
    try {
      await loadConfig(filePath);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/YAML parse error/);
    expect((caught as Error).cause).toBeDefined();
  });

  it('rejects malformed JSON, with the original error as cause', async () => {
    const filePath = await writeFixture('bad.json', '{ not valid json');
    let caught: unknown;
    try {
      await loadConfig(filePath);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/JSON parse error/);
    expect((caught as Error).cause).toBeDefined();
  });

  it('rejects a non-object top-level value', async () => {
    const filePath = await writeFixture('array.yaml', '- one\n- two\n');
    await expect(loadConfig(filePath)).rejects.toThrow(/must be a YAML\/JSON object/);
  });

  it('rejects a config missing name', async () => {
    const filePath = await writeFixture(
      'no-name.yaml',
      'browser:\n  headless: true\nsteps:\n  - action: log\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/missing required field: name/);
  });

  it('rejects a config with an empty name', async () => {
    const filePath = await writeFixture(
      'empty-name.yaml',
      'name: "  "\nbrowser:\n  headless: true\nsteps:\n  - action: log\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/missing required field: name/);
  });

  it('rejects a config missing browser', async () => {
    const filePath = await writeFixture('no-browser.yaml', 'name: Test\nsteps:\n  - action: log\n');
    await expect(loadConfig(filePath)).rejects.toThrow(/missing required field: browser/);
  });

  it('rejects browser.headless that is not a boolean', async () => {
    const filePath = await writeFixture(
      'bad-headless.yaml',
      'name: Test\nbrowser:\n  headless: "yes"\nsteps:\n  - action: log\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/browser\.headless must be a boolean/);
  });

  it('rejects an invalid browser.engine value', async () => {
    const filePath = await writeFixture(
      'bad-engine.yaml',
      'name: Test\nbrowser:\n  headless: true\n  engine: safari\nsteps:\n  - action: log\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/browser\.engine must be one of/);
  });

  it('accepts each valid browser.engine value', async () => {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const filePath = await writeFixture(
        `engine-${engine}.yaml`,
        `name: Test\nbrowser:\n  headless: true\n  engine: ${engine}\nsteps:\n  - action: log\n`,
      );
      const config = await loadConfig(filePath);
      expect(config.browser.engine).toBe(engine);
    }
  });

  it('rejects a config with a missing steps array', async () => {
    const filePath = await writeFixture(
      'no-steps.yaml',
      'name: Test\nbrowser:\n  headless: true\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/missing required field: steps/);
  });

  it('rejects a config with an empty steps array', async () => {
    const filePath = await writeFixture(
      'empty-steps.yaml',
      'name: Test\nbrowser:\n  headless: true\nsteps: []\n',
    );
    await expect(loadConfig(filePath)).rejects.toThrow(/missing required field: steps/);
  });
});
