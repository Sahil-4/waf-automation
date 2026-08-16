# Contributing

## Setup

```bash
git clone <repo-url>
cd waf
npm install
npx playwright install chromium
```

`npm install` runs the `prepare` script, which wires up the git hooks in `.husky/`. If hooks aren't firing on commit/push, re-run `npm install`.

## Before making a change

1. Create a branch off `main`.
2. `npm run dev` to run the CLI from source, or `npm run build` to compile.
3. Keep changes scoped — one logical change per commit where possible; makes the commit type/message easier to get right and the eventual changelog readable.

## Before committing

You don't need to manually run lint/format — `pre-commit` does it for you (`eslint --fix` + `prettier --write` on staged files only). If it can't auto-fix something, the commit will fail with the error printed; fix it and re-commit.

If you want to check everything up front:

```bash
npm run lint
npm run format:check
npm run build
```

## Commit messages

Enforced by `commit-msg` (commitlint), format:

```
type(scope): subject
```

`scope` is optional. `type` must be one of:

| Type | Use for |
|---|---|
| `feat` | a new feature |
| `fix` | a bug fix |
| `docs` | documentation only |
| `style` | formatting, no code meaning change |
| `refactor` | code change that's neither a fix nor a feature |
| `perf` | performance improvement |
| `test` | adding/fixing tests |
| `build` | build system or dependencies |
| `ci` | CI configuration |
| `chore` | anything else (tooling, maintenance) |
| `revert` | reverts a previous commit |

Subject: lowercase, no trailing period, imperative mood ("add", not "added"/"adds").

```
fix: correct token interpolation for object context values
feat(cli): add --dry-run flag
docs: update install instructions in README
```

For a breaking change, add `!` after the type/scope, or a `BREAKING CHANGE:` footer:

```
feat!: drop support for Node 18
```

**Why this matters beyond style**: commit types are machine-read to decide version bumps and generate the changelog automatically (`fix` → patch, `feat` → minor, breaking → major). A vague message like "fix stuff" breaks that, not just the git log.

## Before pushing

`pre-push` runs the full check (`build` + `lint` + `format:check`), not just staged files — catches anything a partial commit-time check could miss. If it fails, fix locally before pushing; don't rely on CI to catch it first.

## Versioning

Don't hand-edit the `version` field in `package.json` and don't run `npm version` yourself. CI (`release-please`) maintains a standing release PR built from your commit types — merging that PR (a maintainer decision, not automatic) bumps the version, updates `CHANGELOG.md`, and tags the release. Just get the commit type right and the PR writes itself.

## Skipping hooks

`--no-verify` exists for genuine exceptions, not as a default habit — it skips validation locally, but the same checks still run in CI, so skipping locally just moves the failure later.
