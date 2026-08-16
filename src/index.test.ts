import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './index';
import type { WafConfig } from './index';
import type { Logger } from './logger';

vi.mock('./loader', () => ({
  loadConfig: vi.fn(),
}));
vi.mock('./executor', () => ({
  executeSteps: vi.fn().mockResolvedValue({ page: null, browser: null }),
}));

import { loadConfig } from './loader';
import { executeSteps } from './executor';

function makeConfig(overrides: Partial<WafConfig> = {}): WafConfig {
  return {
    name: 'test config',
    browser: { headless: true },
    steps: [{ action: 'log', argument: 'hi' }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executeSteps).mockResolvedValue({ page: null, browser: null } as never);
});

describe('run — dry-run mode', () => {
  it('returns success without calling executeSteps', async () => {
    const result = await run({ config: makeConfig(), dryRun: true });
    expect(result.status).toBe('success');
    expect(executeSteps).not.toHaveBeenCalled();
  });

  it('reflects config.variables in the returned context, not an empty object', async () => {
    const result = await run({
      config: makeConfig({ variables: { foo: 'bar', count: '1' } }),
      dryRun: true,
    });
    expect(result.context).toEqual({ foo: 'bar', count: '1' });
  });
});

describe('run — config input', () => {
  it('accepts a file path string and calls loadConfig with it', async () => {
    vi.mocked(loadConfig).mockResolvedValue(makeConfig());
    await run({ config: './some-config.yaml', dryRun: true });
    expect(loadConfig).toHaveBeenCalledWith('./some-config.yaml');
  });

  it('accepts a pre-parsed WafConfig object and never calls loadConfig', async () => {
    await run({ config: makeConfig(), dryRun: true });
    expect(loadConfig).not.toHaveBeenCalled();
  });
});

describe('run — headed override', () => {
  it('headed: true forces browser.headless to false before executing', async () => {
    await run({ config: makeConfig({ browser: { headless: true } }), headed: true });
    expect(executeSteps).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      null,
      expect.anything(),
      expect.objectContaining({ browser: expect.objectContaining({ headless: false }) }),
    );
  });

  it('headed unset leaves browser.headless untouched', async () => {
    await run({ config: makeConfig({ browser: { headless: true } }) });
    expect(executeSteps).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      null,
      expect.anything(),
      expect.objectContaining({ browser: expect.objectContaining({ headless: true }) }),
    );
  });
});

describe('run — success/failure mapping', () => {
  it('on success, returns full context/log/durationMs with status success', async () => {
    const result = await run({ config: makeConfig() });
    expect(result.status).toBe('success');
    expect(result.failedStep).toBeNull();
    expect(typeof result.durationMs).toBe('number');
  });

  it('on an executeSteps failure, returns status failed with the correct failedStep', async () => {
    const failingStep = { action: 'click' as const, label: 'the failing step' };
    const config = makeConfig({ steps: [failingStep] });

    vi.mocked(executeSteps).mockImplementation((steps, context, page, browser, logger: Logger) => {
      logger.stepStart(0, failingStep);
      logger.stepEnd(0, failingStep, 'failed', 5, 'boom');
      throw new Error('boom');
    });

    const result = await run({ config });

    expect(result.status).toBe('failed');
    expect(result.failedStep).toEqual(failingStep);
  });
});

describe('run — loadConfig failure', () => {
  it('returns a failed RunResult instead of throwing', async () => {
    vi.mocked(loadConfig).mockRejectedValue(new Error('config not found'));
    const result = await run({ config: './missing.yaml' });
    expect(result.status).toBe('failed');
    expect(result.failedStep).toBeNull();
    expect(executeSteps).not.toHaveBeenCalled();
  });

  it('does not reject the returned promise', async () => {
    vi.mocked(loadConfig).mockRejectedValue(new Error('config not found'));
    await expect(run({ config: './missing.yaml' })).resolves.toBeDefined();
  });
});
