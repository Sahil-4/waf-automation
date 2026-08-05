import type { ActionType, Step } from './index';

export interface StepLogEntry {
  stepIndex: number;
  label: string;
  action: ActionType;
  status: 'success' | 'failed' | 'skipped' | 'ignored';
  durationMs: number;
  error?: string;
}

export class Logger {
  private logs: StepLogEntry[] = [];
  private stepTimers: Map<number, number> = new Map();

  info(message: string): void {
    console.log(`[waf] INFO  ${message}`);
  }

  warn(message: string): void {
    console.warn(`[waf] WARN  ${message}`);
  }

  error(message: string): void {
    console.error(`[waf] ERROR ${message}`);
  }

  stepStart(index: number, step: Step): void {
    this.stepTimers.set(index, Date.now());
    const label = step.label ?? step.action;
    console.log(`[waf] → [${index}] ${label} (${step.action})`);
  }

  stepEnd(
    index: number,
    step: Step,
    status: StepLogEntry['status'],
    durationMs: number,
    error?: string,
  ): void {
    const label = step.label ?? step.action;
    const entry: StepLogEntry = {
      stepIndex: index,
      label,
      action: step.action,
      status,
      durationMs,
      error,
    };
    this.logs.push(entry);

    if (status === 'success') {
      console.log(`[waf] ✓ ${label} (${step.action}) ${durationMs}ms`);
    } else if (status === 'failed') {
      console.error(`[waf] ✗ ${label} (${step.action}) — Error: ${error ?? 'unknown'}`);
    } else if (status === 'ignored') {
      console.warn(`[waf] ~ ${label} (${step.action}) ignored — ${error ?? 'unknown'}`);
    } else if (status === 'skipped') {
      console.log(`[waf] - ${label} (${step.action}) skipped`);
    }
  }

  getLogs(): StepLogEntry[] {
    return [...this.logs];
  }
}
