#!/usr/bin/env node
import { Command } from 'commander';
import { run } from './index';

const program = new Command();

program
  .name('waf')
  .description('Web Automation Framework — general-purpose browser step executor')
  .version('0.1.0');

program
  .command('run')
  .description('Execute a WAF config file')
  .requiredOption('-c, --config <path>', 'Path to .yaml, .yml, or .json config file')
  .option('--headed', 'Run with a visible browser window', false)
  .option('--dry-run', 'Validate config and print steps without executing', false)
  .action(async (opts: { config: string; headed: boolean; dryRun: boolean }) => {
    const startMs = Date.now();

    if (opts.dryRun) {
      console.log('[waf] dry-run mode — validating config only');
    }

    try {
      const result = await run({
        config: opts.config,
        headed: opts.headed,
        dryRun: opts.dryRun,
      });

      const totalMs = Date.now() - startMs;
      const total = result.log.length;
      const passed = result.log.filter((l) => l.status === 'success').length;
      const failed = result.log.filter((l) => l.status === 'failed').length;
      const ignored = result.log.filter((l) => l.status === 'ignored').length;

      console.log('');
      console.log(
        `[waf] Run complete: ${total} steps | ✓ ${passed} passed | ✗ ${failed} failed | ~ ${ignored} ignored | ${totalMs}ms`,
      );

      if (result.status === 'failed') {
        process.exit(1);
      }
    } catch (err) {
      console.error(`[waf] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
