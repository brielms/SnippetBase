#!/usr/bin/env node

/**
 * SnippetBase Licensing Setup Script
 * Helps manage private keys and generate licenses easily
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

console.log('🔐 SnippetBase Licensing Setup\n');

// Check if private key is already set
const privateKey = process.env.SNIPPETBASE_PRIVATE_KEY;

if (privateKey) {
  console.log('✅ Private key found in environment variables');
  console.log(`   Key: ${privateKey.substring(0, 20)}...${privateKey.substring(privateKey.length - 10)}`);
} else {
  console.log('❌ No private key found in environment variables');

  // Check if there's a private-key.txt file
  if (existsSync('private-key.txt')) {
    console.log('📄 Found private-key.txt file');
    const fileKey = readFileSync('private-key.txt', 'utf8').trim();

    console.log('\nChoose an option:');
    console.log('1. Use key from private-key.txt file');
    console.log('2. Generate new keypair');
    console.log('3. Enter key manually');

    process.stdout.write('Enter choice (1-3): ');

    process.stdin.once('data', (input) => {
      const choice = input.toString().trim();

      switch (choice) {
        case '1':
          console.log(`\nSetting private key from file...`);
          console.log(`Run: $env:SNIPPETBASE_PRIVATE_KEY = "${fileKey}"`);
          break;

        case '2':
          console.log('\nGenerating new keypair...');
          try {
            execSync('node tools/generate-keypair.mjs', { stdio: 'inherit' });
          } catch (error) {
            console.error('Failed to generate keypair:', error.message);
          }
          break;

        case '3':
          console.log('\nEnter your private key (base64url format):');
          process.stdout.write('Private key: ');

          process.stdin.once('data', (keyInput) => {
            const manualKey = keyInput.toString().trim();
            console.log(`\nSetting private key...`);
            console.log(`Run: $env:SNIPPETBASE_PRIVATE_KEY = "${manualKey}"`);
            console.log('\nThen generate licenses with:');
            console.log('node tools/generate-license.mjs "user-id" "email@domain.com" [seats]');
            process.exit(0);
          });
          break;

        default:
          console.log('Invalid choice');
          process.exit(1);
      }

      console.log('\nThen generate licenses with:');
      console.log('node tools/generate-license.mjs "user-id" "email@domain.com" [seats]');
      process.exit(0);
    });
  } else {
    console.log('No private-key.txt file found either.');
    console.log('\n❓ What would you like to do?');
    console.log('1. Generate new keypair');
    console.log('2. Enter existing private key manually');

    process.stdout.write('Enter choice (1-2): ');

    process.stdin.once('data', (input) => {
      const choice = input.toString().trim();

      switch (choice) {
        case '1':
          console.log('\nGenerating new keypair...');
          try {
            execSync('node tools/generate-keypair.mjs', { stdio: 'inherit' });
            console.log('\n🎉 New keypair generated!');
            console.log('Remember to update the public key in src/licensing/license.ts');
          } catch (error) {
            console.error('Failed to generate keypair:', error.message);
            process.exit(1);
          }
          break;

        case '2':
          console.log('\nEnter your existing private key (base64url format):');
          process.stdout.write('Private key: ');

          process.stdin.once('data', (keyInput) => {
            const manualKey = keyInput.toString().trim();
            console.log(`\nSetting private key...`);
            console.log(`Run: $env:SNIPPETBASE_PRIVATE_KEY = "${manualKey}"`);
            console.log('\nThen generate licenses with:');
            console.log('node tools/generate-license.mjs "user-id" "email@domain.com" [seats]');
            process.exit(0);
          });
          return;

        default:
          console.log('Invalid choice');
          process.exit(1);
      }

      console.log('\n📋 License Generation Commands:');
      console.log('node tools/generate-license.mjs "user-123" "user@example.com" 2');
      console.log('node tools/generate-license.mjs "buyer-456" "buyer-789"');
      console.log('node tools/generate-license.mjs "org-789" "admin@company.com" 10');

      console.log('\n🔍 Test Commands:');
      console.log('npm run test:license');
      console.log('npm run build && npm run lint');

      process.exit(0);
    });
  }
}

console.log('\n📋 License Generation Commands:');
console.log('node tools/generate-license.mjs "user-123" "user@example.com" 2');
console.log('node tools/generate-license.mjs "buyer-456" "buyer-789"');
console.log('node tools/generate-license.mjs "org-789" "admin@company.com" 10');

console.log('\n🔍 Test Commands:');
console.log('npm run test:license');
console.log('npm run build && npm run lint');

console.log('\n📁 Files:');
console.log('- main.js (built plugin)');
console.log('- manifest.json (plugin metadata)');
console.log('- styles.css (plugin styles)');

console.log('\n✨ Ready to generate licenses!');
