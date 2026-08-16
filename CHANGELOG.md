# Changelog

## [0.2.0](https://github.com/Sahil-4/waf-automation/compare/waf-automation-v0.1.0...waf-automation-v0.2.0) (2026-08-16)


### Features

* add ESLint rules for test files to allow loose typing in testing utilities ([7ba714f](https://github.com/Sahil-4/waf-automation/commit/7ba714f8968170ba441cf9bea6d6d9adfde5a212))
* add sample and page two HTML fixtures for testing ([ea4b181](https://github.com/Sahil-4/waf-automation/commit/ea4b181b052069b4fcd542294a6f0f27538e32a2))
* add TypeScript configuration for Vitest and update tsconfig settings ([6eb0a0d](https://github.com/Sahil-4/waf-automation/commit/6eb0a0d6ad2ac154d8f96f26e88bb5d7efe9320e))
* disable unbound-method rule for test utilities to avoid false positives ([c59537a](https://github.com/Sahil-4/waf-automation/commit/c59537a40acf63d98bcff982dad1799a713a2b4b))


### Bug Fixes

* add test artifacts to .gitignore to prevent clutter in version control ([92d00b4](https://github.com/Sahil-4/waf-automation/commit/92d00b44f0af7b50a169d4fec625d33429c18082))
* enhance error handling in loadConfig for better debugging ([9b7df89](https://github.com/Sahil-4/waf-automation/commit/9b7df89a34defd5d7ba0f949408606c0b1bf95cd))
* formatting ([a7c7878](https://github.com/Sahil-4/waf-automation/commit/a7c78780888ba8f75a38f567705976201b030f7f))
* improve error handling in evaluateCondition and breakAction functions ([2e74030](https://github.com/Sahil-4/waf-automation/commit/2e74030d7b013e60435c88876e5be7c58f693451))
* improve value interpolation handling in RuntimeContext ([ed55e82](https://github.com/Sahil-4/waf-automation/commit/ed55e824ebbb4649c6baa2231bf0f904f33df234))
* remove async from storeValue and logMessage functions for consistency ([1c6de6f](https://github.com/Sahil-4/waf-automation/commit/1c6de6fac5e56dd82686957e41cade5038dc9eb0))
* throw on missing context key, wait for selector in selectOption/hover ([5dbedef](https://github.com/Sahil-4/waf-automation/commit/5dbedef87ecd6664527d46e3d1cc139b1e62ffde))
* update node version to 22 in CI workflow ([f7eab37](https://github.com/Sahil-4/waf-automation/commit/f7eab37558d66bae5c9e9da23c45aff310a53b7c))
* update repository URLs in package.json for consistency ([6349f44](https://github.com/Sahil-4/waf-automation/commit/6349f4434bbfd7122171a28e225f6169fd6e5e2c))
* update timeout handling in waitForSelector and improve error logging in executeSteps ([beb24d8](https://github.com/Sahil-4/waf-automation/commit/beb24d8e611f7e69d6b646e467d1c5b38f18d5c4))
