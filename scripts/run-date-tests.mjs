// scripts/run-date-tests.mjs

import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const tempFile = './.tmp/dateMath.test.mjs';

async function runTests() {
  try {
    // Bundle the test file
    await build({
      entryPoints: ['tests/dateMath.test.ts'],
      outfile: tempFile,
      platform: 'node',
      format: 'esm',
      bundle: true,
      external: [], // No external dependencies
    });

    // Read and execute the bundled test
    const testCode = readFileSync(tempFile, 'utf8');
    eval(testCode);

  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

runTests();
