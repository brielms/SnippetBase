#!/usr/bin/env node

/**
 * Test script to verify signature enforcement in license verification
 * Tests various failure cases to ensure security
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the license functions from the built version
const { verifyLicenseKey, parseToken } = await import('../main.js');

console.log('🔐 Testing SnippetBase license signature enforcement...\n');

// Test cases
const tests = [
  {
    name: 'Wrong prefix',
    token: 'INVALID.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdC1saWMtMTIzIiwiaWF0IjoxNzM0NzY4MDAwfQ.signature-placeholder',
    shouldPass: false,
    expectedError: 'Invalid token type'
  },
  {
    name: 'Invalid JSON payload',
    token: 'SB1.invalid-json-payload.signature-placeholder',
    shouldPass: false,
    expectedError: 'Invalid token format'
  },
  {
    name: 'Invalid license payload (wrong product)',
    token: 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoid3JvbmctcHJvZHVjdCIsInBsYW4iOiJwcm8iLCJsaWNlbnNlSWQiOiJ0ZXN0LWxpYy0xMjMiLCJpYXQiOjE3MzQ3NjgwMDB9.signature-placeholder',
    shouldPass: false,
    expectedError: 'Invalid license payload'
  }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    console.log(`Testing: ${test.name}`);
    const result = await verifyLicenseKey(test.token);

    if (test.shouldPass) {
      if (result.ok) {
        console.log(`  ✅ PASS: License accepted as expected`);
        passed++;
      } else {
        console.log(`  ❌ FAIL: Expected license to be accepted but got: ${result.error}`);
        failed++;
      }
    } else {
      if (!result.ok) {
        if (test.expectedError && result.error?.includes(test.expectedError)) {
          console.log(`  ✅ PASS: License rejected with expected error: ${result.error}`);
          passed++;
        } else {
          console.log(`  ❌ FAIL: License rejected but with wrong error. Expected: ${test.expectedError}, Got: ${result.error}`);
          failed++;
        }
      } else {
        console.log(`  ❌ FAIL: Expected license to be rejected but it was accepted`);
        failed++;
      }
    }
    console.log('');
  } catch (error) {
    console.log(`  ❌ ERROR: Test threw exception: ${error.message}`);
    failed++;
    console.log('');
  }
}

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All signature enforcement tests passed! Licensing is secure.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Signature enforcement may have security issues.');
  process.exit(1);
}
