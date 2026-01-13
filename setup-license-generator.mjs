#!/usr/bin/env node

// setup-license-generator.mjs
// Setup script to create a custom license generator with your own keys
// Run: node setup-license-generator.mjs

import { generateKeyPairSync } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

console.log('🔐 Setting up SnippetBase License Generator\n');

// Generate fresh ECDSA P-256 keypair
console.log('Generating ECDSA P-256 keypair...');
const { publicKey: publicKeyPem, privateKey: privateKeyPem } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('✅ Keys generated!\n');

// Update the generate-license.mjs script with the new private key
console.log('Updating generate-license.mjs with your private key...');
let scriptContent = readFileSync('generate-license.mjs', 'utf8');
scriptContent = scriptContent.replace(
  /const PRIVATE_KEY_PEM = `[\s\S]*?`;/,
  `const PRIVATE_KEY_PEM = \`${privateKeyPem}\`;`
);
writeFileSync('generate-license.mjs', scriptContent);

console.log('✅ Script updated!\n');

// Show the public key that needs to be embedded in the plugin
console.log('📋 Add this PUBLIC key to src/licensing/license.ts:');
console.log('='.repeat(50));
console.log(publicKeyPem);
console.log('='.repeat(50));
console.log();

// Show usage
console.log('🚀 Now generate licenses with:');
console.log('node generate-license.mjs "customer-id" "email@domain.com" 2');
console.log('node generate-license.mjs "buyer-456" "company-id"');
console.log('\n✨ Done! Your license generator is ready.');

// Save the private key for backup
console.log('\n💾 Private key saved to: private-key-backup.pem');
writeFileSync('private-key-backup.pem', privateKeyPem);
