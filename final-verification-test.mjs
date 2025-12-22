#!/usr/bin/env node

// Final verification test - sign and verify with same keys
import { createSign } from 'crypto';
import { pemToDer, verifyEcdsaP256Spki } from './src/licensing/crypto.ts';

// Get keys from current files
import { readFileSync } from 'fs';

const privateKeyPem = readFileSync('generate-license.mjs', 'utf8')
  .match(/const PRIVATE_KEY_PEM = `([\s\S]*?)`;/)?.[1];

const licenseTs = readFileSync('src/licensing/license.ts', 'utf8');
const publicKeyMatch = licenseTs.match(/const PUBLIC_KEY_PEM = `([\s\S]*?)`;/);
const publicKeyPem = publicKeyMatch?.[1];

if (!privateKeyPem || !publicKeyPem) {
  console.error('Could not extract keys from files');
  process.exit(1);
}

console.log('Testing key synchronization...\n');

// Test message (same format as license generation)
const testMessage = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdCIsImlzc3VlZEF0IjoxMjM0LCJzZWF0cyI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0';

try {
  // Sign with private key
  const sign = createSign('SHA256');
  sign.update(testMessage);
  const signatureDer = sign.sign(privateKeyPem);

  // Convert to base64url (same as JWT)
  const signatureB64 = signatureDer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('✅ Signed message with private key');
  console.log('Signature DER length:', signatureDer.length);
  console.log('Signature B64 length:', signatureB64.length);

  // Decode back for verification
  const signatureBytes = Buffer.from(signatureB64, 'base64');

  // Verify with public key
  const publicKeyDer = pemToDer(publicKeyPem);
  const messageBytes = new TextEncoder().encode(testMessage);

  console.log('Public key DER length:', publicKeyDer.length);
  console.log('Message bytes length:', messageBytes.length);

  const isValid = await verifyEcdsaP256Spki(publicKeyDer, messageBytes, signatureBytes);

  if (isValid) {
    console.log('🎉 SUCCESS: Keys are synchronized and verification works!');
    console.log('✅ The licensing system should work in Obsidian.');
  } else {
    console.log('❌ FAILURE: Keys are NOT synchronized!');
    console.log('The private key in generate-license.mjs does not match the public key in license.ts');
  }

} catch (error) {
  console.error('❌ Test failed with error:', error.message);
}
