# Publishing checklist

General npm publishing checklist, checked against `waf-automation`'s current state.

## Identity

- [x] Name available on npm (`npm view <name>`) — `waf-automation` confirmed free (`waf` was taken)
- [x] Accurate `description`, `keywords`
- [x] `repository`/`homepage`/`bugs` point to the real GitHub URL — confirmed matching the actual `git remote` (`Sahil-4/waf-automation`)
- [x] `author` set

## Versioning

- [ ] Follow semver strictly; breaking change = major bump, even pre-1.0
- [x] Starting below `1.0.0` is fine (currently `0.1.0`)
- [x] Version bumps are automated via `release-please` — it opens/updates a release PR from conventional commit history; merging it bumps `package.json` and `CHANGELOG.md` and tags the release. Don't run `npm version` by hand.
- [ ] Never hand-edit a published version; always publish a new one

## What gets published

- [x] `"files"` allowlist used instead of `.npmignore` (fails safe)
- [x] `npm pack --dry-run` before every publish — read the actual file list
- [x] Note: `package.json`, `README*`, `LICENSE*` are always included regardless of `files`
- [x] `prepublishOnly` runs the build so `dist/` is never stale

## Runtime correctness

- [x] `main` / `types` / `bin` point to files that exist after build
- [x] Compiled `bin` entry keeps its `#!/usr/bin/env node` shebang
- [x] `engines.node` reflects the real minimum version
- [ ] `"exports"` map only needed for ESM/CJS split or blocking deep imports — not needed here

## Dependencies

- [x] Runtime deps in `dependencies`, tooling in `devDependencies`
- [x] `npm audit` before publishing — 0 vulnerabilities. (The prior 7 were all bundled inside `@semantic-release/npm`'s dependency on the `npm` CLI itself, not `waf-automation`'s own tree — resolved automatically by switching to `release-please`, which needs no local npm package at all.)
- [x] Prefer caret ranges unless a dependency has a history of breaking minors — confirmed, all deps use `^`
- [x] Manual extra-install steps documented (`npx playwright install chromium`) instead of postinstall magic

## Documentation

- [x] README covers install, usage, config reference, license
- [x] LICENSE matches the `license` field
- [ ] `CHANGELOG.md` — add once there's a second version to diff against

## Testing & CI

- [x] Automated tests before others depend on this — 172 tests (unit + integration + e2e), coverage thresholds enforced (95%/95%/90%/75% lines/statements/functions/branches)
- [x] CI runs build/lint/test on push and PR — `.github/workflows/ci.yml` added (`build-and-lint`, `test`, `commitlint`, `release` jobs); not yet run for real since nothing's been pushed
- [ ] CI blocks merges on failure — needs branch protection, a GitHub repo *setting* not a file; only possible once the workflow has run at least once on GitHub

## Pre-publish pass (every release)

- [ ] `build`, `lint`, `format:check` all clean
- [ ] `npm pack --dry-run` — check the file list
- [ ] Install the packed tarball in a scratch dir and smoke-test it
- [ ] Diff `package.json` against the last published version

## Publishing

- [ ] `npm login`, confirm with `npm whoami`
- [ ] Enable 2FA on the npm account, require it for publish
- [ ] Scoped packages need `--access public` on first publish — n/a here (unscoped)
- [ ] `--provenance` only matters once publishing from CI
- [ ] Treat as a production action — run it yourself, don't automate away

## After publishing

- [ ] Check the live npmjs.com page matches expectations
- [ ] Tag the release in git, `git push --follow-tags`
- [ ] Use `npm deprecate`, not `npm unpublish`, if something's broken
- [ ] Update `CHANGELOG.md`

## Ongoing

- [ ] Watch `npm audit` / Dependabot alerts
- [ ] Respond to issues
- [ ] Revisit `engines.node` as old Node versions go EOL
