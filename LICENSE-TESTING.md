# SnippetBase License Testing & Regression Prevention

## Overview

SnippetBase includes comprehensive license testing to prevent accidentally breaking existing customer licenses during development and updates.

## How It Works

### Automatic License Fixtures

Every time you generate a license with `tools/generate-license.mjs`, it automatically gets saved to `tests/fixtures/licenses.private.json` for regression testing.

### Regression Tests

Run `npm run test:license:regression` to verify that ALL previously generated licenses still work with the current codebase.

**This prevents accidentally locking out customers when making changes to the licensing system.**

## Test Coverage

The regression test suite includes:

1. **Ephemeral Key Verification** - Tests license generation and verification with temporary keys
2. **Tampering Detection** - Ensures invalid/modified licenses are properly rejected
3. **Private License Fixtures** - Verifies all historical licenses still work

## Usage

### Generate a License (Automatically Adds to Tests)

```bash
# Single user license
node tools/generate-license.mjs "user123" "user@example.com"

# Team license with 5 seats
node tools/generate-license.mjs "team-abc" "team@example.com" 5

# License with buyer ID instead of email
node tools/generate-license.mjs "buyer456" "company-id"
```

### Run Regression Tests

```bash
# Test all historical licenses
npm run test:license:regression
```

If any licenses fail verification, the test will exit with an error and show which licenses are broken.

## Important Files

- `tests/fixtures/licenses.private.json` - Contains all generated licenses (automatically managed, gitignored)
- `scripts/test-license-regression.mjs` - Runs the regression test suite
- `tools/generate-license.mjs` - Generates licenses and adds them to fixtures

## Before Deploying Updates

**ALWAYS run the regression tests before deploying:**

```bash
npm run test:license:regression
```

If tests pass ✅, it's safe to deploy.
If tests fail ❌, DO NOT DEPLOY until you fix the licensing issues.

This ensures we never accidentally break existing customer licenses! 🔒
