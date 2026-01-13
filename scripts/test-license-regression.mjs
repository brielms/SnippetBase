#!/usr/bin/env node

// scripts/test-license-regression.mjs
// Test all previously generated licenses for regression
// Run with: node scripts/test-license-regression.mjs

import { build } from 'esbuild';
import { unlinkSync } from 'fs';

const tempFile = '../.tmp/license-regression.test.mjs';

async function runTests() {
  try {
    // Bundle the test file
    await build({
      entryPoints: ['scripts/license-verification.test.ts'],
      outfile: tempFile,
      platform: 'node',
      format: 'esm',
      bundle: true,
      external: ['obsidian'], // Exclude obsidian from bundle
    });

    // Import and run the bundled test
    await import(tempFile);

  } catch (error) {
    console.error('License regression test failed:', error);
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
