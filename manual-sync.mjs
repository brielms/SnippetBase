#!/usr/bin/env node

// Manually sync the keys
import { readFileSync, writeFileSync } from 'fs';

// Read the current private key from generate-license.mjs
const generateJs = readFileSync('generate-license.mjs', 'utf8');
const privateKeyMatch = generateJs.match(/const PRIVATE_KEY_PEM = `([\s\S]*?)`;/);
const privateKeyPem = privateKeyMatch?.[1];

if (!privateKeyPem) {
  console.error('Could not find private key in generate-license.mjs');
  process.exit(1);
}

console.log('Found private key in generate-license.mjs');
console.log('Private key length:', privateKeyPem.length);

// For ECDSA keys, the public key can be derived from the private key
// Since the Node.js crypto export doesn't work, let's manually construct the corresponding public key
// The last part of the private key contains the public key data

// Extract the base64 part from the private key
const privateKeyBase64 = privateKeyPem
  .replace(/-----BEGIN PRIVATE KEY-----/, '')
  .replace(/-----END PRIVATE KEY-----/, '')
  .replace(/\s/g, '');

// Decode and find the public key part
const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');

// For PKCS#8 EC private key, the public key is at the end
// Let's try to extract it manually
console.log('Private key bytes length:', privateKeyBytes.length);

// The last 65 bytes should be the public key (1 byte type + 64 bytes key)
const publicKeyBytes = privateKeyBytes.slice(-65);
console.log('Extracted public key bytes length:', publicKeyBytes.length);

// Convert back to base64
const publicKeyBase64 = publicKeyBytes.toString('base64');

// Format as PEM
const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

console.log('\nDerived public key:');
console.log(publicKeyPem);

// Update license.ts
const licenseTs = readFileSync('src/licensing/license.ts', 'utf8');
const updatedLicenseTs = licenseTs.replace(
  /const PUBLIC_KEY_PEM = `[\s\S]*?`;/,
  `const PUBLIC_KEY_PEM = \`${publicKeyPem}\`;`
);

writeFileSync('src/licensing/license.ts', updatedLicenseTs);
console.log('\n✅ Updated src/licensing/license.ts with the derived public key');
