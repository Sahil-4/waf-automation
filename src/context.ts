import type { WafConfig } from './index';
import type { Logger } from './logger';

export class RuntimeContext {
  private store: Map<string, unknown> = new Map();
  private logger: Logger;

  constructor(config: WafConfig, logger: Logger) {
    this.logger = logger;
    if (config.variables) {
      for (const [key, value] of Object.entries(config.variables)) {
        this.store.set(key, value);
      }
    }
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  get(key: string): unknown {
    return this.store.get(key);
  }

  interpolate(str: string): string {
    return str.replace(/\{\{ctx\.([^}]+)\}\}/g, (_match, key: string) => {
      if (this.store.has(key)) {
        const val = this.store.get(key);
        return val !== null && val !== undefined ? String(val) : '';
      }
      this.logger.warn(`Interpolation token {{ctx.${key}}} not found in context — leaving as-is`);
      return `{{ctx.${key}}}`;
    });
  }

  all(): Record<string, unknown> {
    return Object.fromEntries(this.store.entries());
  }
}
