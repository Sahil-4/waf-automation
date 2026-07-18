# waf

**Web Automation Framework** — a general-purpose browser step executor built on [Playwright](https://playwright.dev/).

`waf` reads an ordered list of steps from a JSON or YAML config file and executes them sequentially in a real browser. It has no built-in knowledge of what the steps are trying to accomplish — it's a runtime for automation configs, not a scraper for any particular site. Use it as a CLI, or import it as a library from your own Node.js/TypeScript code.

## Features

- Declarative JSON/YAML config — describe a browser session as a list of steps
- CLI (`waf run`) and programmatic API (`run()`)
- Token interpolation (`{{ctx.key}}`) for passing values between steps
- Control flow: `loop`, `if`, `if-else`, `break`
- Scraping helpers: single value, single attribute, or structured lists via `scrape-all`
- Structured per-step run log (status, duration, errors)
- Chromium, Firefox, or WebKit via Playwright

## Installation

```bash
npm install
npx playwright install chromium
npm run build
```

## Quick start (CLI)

```bash
waf run --config configs/example.yaml
```

Options:

```
waf run --config <path>           Execute a config file (.yaml, .yml, or .json)
waf run --config <path> --headed  Run with a visible browser window
waf run --config <path> --dry-run Validate the config and print steps without executing
```

Sample output:

```
[waf] ✓ Open Hacker News (browser-open) 812ms
[waf] ✓ Wait for story list (wait-for-selector) 143ms
[waf] ✓ Scrape all stories (scrape-all) 27ms
[waf] ✓ Save stories to JSON (save-to-file) 4ms
[waf] ✓ Capture page screenshot (screenshot) 210ms
[waf] ✓ Close browser (browser-close) 56ms

[waf] Run complete: 6 steps | ✓ 6 passed | ✗ 0 failed | ~ 0 ignored | 1252ms
```

## Quick start (library)

```typescript
import { run } from 'waf';

const result = await run({
  config: './configs/example.yaml', // or a pre-parsed WafConfig object
  headed: false,
  dryRun: false,
});

console.log(result.status);   // 'success' | 'failed'
console.log(result.context);  // final RuntimeContext snapshot
console.log(result.log);      // per-step StepLogEntry[]
```

## Config schema

```typescript
interface WafConfig {
  name: string;
  description?: string;
  browser: {
    headless: boolean;                             // default true
    engine?: 'chromium' | 'firefox' | 'webkit';     // default chromium
    viewport?: { width: number; height: number };
    userAgent?: string;
  };
  variables?: Record<string, string>;               // seeds the runtime context
  steps: Step[];
}

interface Step {
  action: ActionType;
  label?: string;
  selector?: string;
  selectorType?: 'css' | 'xpath';                   // default css
  argument?: string;                                // supports {{ctx.key}} tokens
  target?: string;                                  // context key to write result into
  onError?: 'fail' | 'ignore';                      // default fail
  condition?: Condition;                             // loop / if / if-else
  steps?: Step[];                                   // child steps for loop / if / if-else
  elseSteps?: Step[];                                // else branch for if-else
}

interface Condition {
  type: 'element-exists' | 'context-equals' | 'context-greater-than' | 'context-contains';
  selector?: string;   // element-exists
  key?: string;        // context-*
  value?: string | number;
}
```

### Token interpolation

Any `{{ctx.keyName}}` token inside `argument`, `selector`, `target`, or `condition.value` is replaced with the current value of that key in the runtime context before the step runs. Values set via `variables` in the config, or via `store-value` / `scrape-*` steps at runtime, are all available. Unresolved keys are left as-is and logged as a warning.

## Action reference

| Action | Description |
|---|---|
| `browser-open` | Launches the browser per `config.browser`; navigates to `argument` if provided. Must be the first step. |
| `browser-close` | Closes the browser. |
| `navigate` | `page.goto(argument)`, waits for network idle. |
| `reload` | Reloads the current page. |
| `go-back` | Navigates back in history. |
| `click` | Waits for `selector`, then clicks it. |
| `type` | Waits for `selector`, then fills it with `argument`. |
| `clear` | Clears the value of `selector`. |
| `press-key` | Presses the keyboard key named in `argument`. |
| `select-option` | Selects an option in `selector` by value `argument`. |
| `hover` | Hovers over `selector`. |
| `scroll` | Scrolls to the bottom (`argument: "bottom"`) or by `argument` pixels. |
| `wait-for-selector` | Waits for `selector` to appear. |
| `wait-for-navigation` | Waits for network idle. |
| `wait-for-timeout` | Waits for `argument` milliseconds. |
| `scrape-text` | Reads `textContent` of `selector` into `target`. |
| `scrape-attribute` | Reads attribute `argument` of `selector` into `target`. |
| `scrape-all` | Reads a list of field mappings (JSON in `argument`, e.g. `[{"name":"title","selector":".title","attribute":"text"}]`) for every element matching `selector`, storing an array in `target`. |
| `element-exists` | Stores a boolean in `target` indicating whether `selector` exists. |
| `store-value` | Writes `argument` into `target`. |
| `log` | Logs `argument`. |
| `save-to-file` | Writes `context[target]` to the file at path `argument` (JSON if object/array, raw text otherwise). Creates directories as needed. |
| `screenshot` | Saves a full-page screenshot to `argument`. |
| `loop` | While `condition` is true, runs `steps` repeatedly. Exits on `break` or when the condition becomes false. |
| `if` | Runs `steps` if `condition` is true. |
| `if-else` | Runs `steps` if `condition` is true, otherwise `elseSteps`. |
| `break` | Exits the nearest enclosing `loop`. |

## Example: `configs/example.yaml`

The bundled example scrapes the Hacker News front page and saves the results:

1. `browser-open` → navigate to `news.ycombinator.com`
2. `wait-for-selector` → wait for the story list
3. `scrape-all` → collect title + link for every story
4. `store-value` / `log` → track and log a page counter
5. `save-to-file` → write results to `./output/hn-stories.json`
6. `screenshot` → save `./output/hn-screenshot.png`
7. `browser-close`

Run it with:

```bash
waf run --config configs/example.yaml
```

## Development

```bash
npm run dev     # run the CLI directly via ts-node
npm run build   # compile TypeScript to dist/
npm start       # run the compiled CLI from dist/
```

Project layout:

```
src/
├── index.ts        Public API (run(), types)
├── cli.ts           CLI entrypoint (commander)
├── loader.ts         Config file parsing/validation (YAML + JSON)
├── context.ts         RuntimeContext + {{ctx.key}} interpolation
├── executor.ts         Recursive step runner
├── logger.ts            Structured per-step run logger
└── actions/
    ├── index.ts          Action dispatcher
    ├── browser.ts        browser-open, browser-close
    ├── navigation.ts     navigate, reload, go-back
    ├── interaction.ts    click, type, clear, press-key, select-option, hover, scroll
    ├── wait.ts           wait-for-selector, wait-for-navigation, wait-for-timeout
    ├── read.ts           scrape-text, scrape-attribute, scrape-all, element-exists
    ├── context.ts        store-value, log
    ├── output.ts         save-to-file, screenshot
    └── control.ts        loop, if, if-else, break
```

## License

MIT — see [LICENSE](LICENSE).
