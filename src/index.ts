import type { StepLogEntry } from './logger';
import { Logger } from './logger';
import { RuntimeContext } from './context';
import { loadConfig } from './loader';
import { executeSteps } from './executor';

export type ActionType =
  | 'browser-open'
  | 'browser-close'
  | 'navigate'
  | 'reload'
  | 'go-back'
  | 'click'
  | 'type'
  | 'clear'
  | 'press-key'
  | 'select-option'
  | 'hover'
  | 'scroll'
  | 'wait-for-selector'
  | 'wait-for-navigation'
  | 'wait-for-timeout'
  | 'scrape-text'
  | 'scrape-attribute'
  | 'scrape-all'
  | 'element-exists'
  | 'store-value'
  | 'log'
  | 'save-to-file'
  | 'screenshot'
  | 'loop'
  | 'if'
  | 'if-else'
  | 'break';

export interface Condition {
  type: 'element-exists' | 'context-equals' | 'context-greater-than' | 'context-contains';
  selector?: string;
  key?: string;
  value?: string | number;
}

export interface Step {
  action: ActionType;
  label?: string;
  selector?: string;
  selectorType?: 'css' | 'xpath';
  argument?: string;
  target?: string;
  onError?: 'fail' | 'ignore';
  condition?: Condition;
  steps?: Step[];
  elseSteps?: Step[];
}

export interface WafConfig {
  name: string;
  description?: string;
  browser: {
    headless: boolean;
    engine?: 'chromium' | 'firefox' | 'webkit';
    viewport?: { width: number; height: number };
    userAgent?: string;
  };
  variables?: Record<string, string>;
  steps: Step[];
}

export interface RunResult {
  status: 'success' | 'failed';
  failedStep: Step | null;
  context: Record<string, unknown>;
  log: StepLogEntry[];
  durationMs: number;
}

export async function run(options: {
  config: string | WafConfig;
  headed?: boolean;
  dryRun?: boolean;
}): Promise<RunResult> {
  const startMs = Date.now();
  const logger = new Logger();

  let config: WafConfig;
  if (typeof options.config === 'string') {
    config = await loadConfig(options.config);
  } else {
    config = options.config;
  }

  if (options.headed) {
    config = { ...config, browser: { ...config.browser, headless: false } };
  }

  if (options.dryRun) {
    logger.info(`[dry-run] Config: ${config.name}`);
    logger.info(`[dry-run] Steps (${config.steps.length}):`);
    for (let i = 0; i < config.steps.length; i++) {
      const s = config.steps[i];
      logger.info(`  [${i}] ${s.label ?? s.action} (${s.action})`);
    }
    return {
      status: 'success',
      failedStep: null,
      context: {},
      log: logger.getLogs(),
      durationMs: Date.now() - startMs,
    };
  }

  const context = new RuntimeContext(config, logger);

  const nullPage = null as unknown as import('playwright').Page;
  const nullBrowser = null as unknown as import('playwright').Browser;

  let failedStep: Step | null = null;

  try {
    await executeSteps(config.steps, context, nullPage, nullBrowser, logger, config);
  } catch {
    const logs = logger.getLogs();
    const lastFailed = [...logs].reverse().find((l) => l.status === 'failed');
    if (lastFailed !== undefined) {
      failedStep = config.steps[lastFailed.stepIndex] ?? null;
    }
    return {
      status: 'failed',
      failedStep,
      context: context.all(),
      log: logs,
      durationMs: Date.now() - startMs,
    };
  }

  return {
    status: 'success',
    failedStep: null,
    context: context.all(),
    log: logger.getLogs(),
    durationMs: Date.now() - startMs,
  };
}

export type { StepLogEntry };
