#!/usr/bin/env node

/**
 * Release asset checklist script
 * Ensures only the required files are present for release
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const REQUIRED_FILES = ['main.js', 'manifest.json', 'styles.css'];
const ALLOWED_EXTRA_FILES = ['README.md', 'LICENSE']; // Optional but allowed

console.log('🔍 Checking release assets...\n');

// Check required files exist
let allRequired = true;
for (const file of REQUIRED_FILES) {
  try {
    const stats = statSync(file);
    if (stats.isFile()) {
      console.log(`✅ ${file} (${stats.size} bytes)`);
    } else {
      console.log(`❌ ${file} is not a file`);
      allRequired = false;
    }
  } catch {
    console.log(`❌ ${file} missing`);
    allRequired = false;
  }
}

// Check for unexpected files
console.log('\n📁 Checking for unexpected files...');
const files = readdirSync('.').filter(f =>
  !f.startsWith('.') &&
  !['node_modules', 'src', 'scripts', 'tests', 'tools', 'debug-date.js', 'test-license.js', 'test-placeholders.js', 'test-signature.mjs'].includes(f)
);

const unexpected = files.filter(f => !REQUIRED_FILES.includes(f) && !ALLOWED_EXTRA_FILES.includes(f));

if (unexpected.length === 0) {
  console.log('✅ No unexpected files found');
} else {
  console.log('⚠️  Unexpected files found:');
  unexpected.forEach(f => console.log(`   - ${f}`));
}

// Validate manifest
console.log('\n📋 Validating manifest.json...');
try {
  const manifest = JSON.parse(await import('fs').then(fs => fs.readFileSync('manifest.json', 'utf8')));

  const checks = [
    { field: 'id', expected: 'snippetbase', value: manifest.id },
    { field: 'version', pattern: /^\d+\.\d+\.\d+$/, value: manifest.version },
    { field: 'minAppVersion', exists: true, value: manifest.minAppVersion },
    { field: 'authorUrl', pattern: /^https:\/\/[^/]+\/[^/]+$/, value: manifest.authorUrl }, // Profile URL, not repo
  ];

  let manifestValid = true;
  for (const check of checks) {
    if (check.expected && check.value !== check.expected) {
      console.log(`❌ manifest.${check.field} should be "${check.expected}", got "${check.value}"`);
      manifestValid = false;
    } else if (check.pattern && !check.pattern.test(check.value)) {
      console.log(`❌ manifest.${check.field} format invalid: "${check.value}"`);
      manifestValid = false;
    } else if (check.exists && !check.value) {
      console.log(`❌ manifest.${check.field} missing`);
      manifestValid = false;
    } else {
      console.log(`✅ manifest.${check.field}: ${check.value}`);
    }
  }

  if (manifestValid) {
    console.log('✅ Manifest validation passed');
  }

} catch (error) {
  console.log(`❌ Manifest validation failed: ${error.message}`);
  allRequired = false;
}

console.log('\n' + '='.repeat(50));

if (allRequired && unexpected.length === 0) {
  console.log('🎉 RELEASE READY: All checks passed!');
  console.log('Required files: main.js, manifest.json, styles.css');
  process.exit(0);
} else {
  console.log('❌ RELEASE BLOCKED: Issues found above');
  process.exit(1);
}
