#!/usr/bin/env node

// tools/generate-keypair.mjs
// Generate Ed25519 keypair for SnippetBase licensing
// Run with: node tools/generate-keypair.mjs

import { generateKeyPairSync } from 'crypto';

function generateKeypair() {
  try {
    // Generate Ed25519 keypair using Node.js crypto
    const { publicKey: publicKeyPem, privateKey: privateKeyPem } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Extract raw bytes from PEM formats
    const publicKeyDer = extractKeyFromPem(publicKeyPem);
    const privateKeyDer = extractKeyFromPem(privateKeyPem);

    // For Ed25519 SPKI: skip first 12 bytes of DER encoding to get 32-byte raw key
    const publicKeyRaw = publicKeyDer.slice(12);
    // For Ed25519 PKCS8: skip first 16 bytes of DER encoding to get 32-byte raw key
    const privateKeyRaw = privateKeyDer.slice(16);

    if (publicKeyRaw.length !== 32 || privateKeyRaw.length !== 32) {
      throw new Error('Failed to extract 32-byte keys from PEM');
    }

    // Convert to base64url
    const publicKeyB64 = base64urlEncode(publicKeyRaw);
    const privateKeyB64 = base64urlEncode(privateKeyRaw);

    // Also generate PEM versions for license generation
    console.log('=== SnippetBase License Keypair Generated ===');
    console.log('');
    console.log('✅ SUCCESS: Keys generated and extracted!');
    console.log('');
    console.log('Public Key (raw base64url for plugin):');
    console.log(publicKeyB64);
    console.log('');
    console.log('Private Key (raw base64url - NEVER commit):');
    console.log(privateKeyB64);
    console.log('');
    console.log('For license generation, set environment variable:');
    console.log(`$env:SNIPPETBASE_PRIVATE_KEY = "${privateKeyB64}"`);
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('  - Embed the PUBLIC key in src/licensing/license.ts');
    console.log('  - Store the PRIVATE key securely (env var or separate file)');
    console.log('  - Never commit the private key to version control');

  } catch (error) {
    console.error('Failed to generate keypair:', error);
    console.log('');
    console.log('Note: Ed25519 key generation requires Node.js 16.18+ or later.');
    console.log('If this fails, you may need to update Node.js or use a different key generation method.');
  }
}

function extractKeyFromPem(pem) {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  return Buffer.from(base64, 'base64');
}

function base64urlEncode(bytes) {
  const base64 = Buffer.from(bytes).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

generateKeypair();
