#!/usr/bin/env node

// tools/generate-keypair.mjs
// Generate ECDSA P-256 keypair for SnippetBase licensing
// Run with: node tools/generate-keypair.mjs

import { generateKeyPairSync } from 'crypto';

function generateKeypair() {
  try {
    // Generate ECDSA P-256 keypair using Node.js crypto
    const { publicKey: publicKeyPem, privateKey: privateKeyPem } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256 curve
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    console.log('=== SnippetBase License Keypair Generated ===');
    console.log('');
    console.log('✅ SUCCESS: ECDSA P-256 keys generated!');
    console.log('');
    console.log('Public Key (PEM format for plugin):');
    console.log(publicKeyPem);
    console.log('');
    console.log('Private Key (PEM format - NEVER commit):');
    console.log(privateKeyPem);
    console.log('');
    console.log('📁 Save private key to file:');
    console.log('echo "' + privateKeyPem.replace(/\n/g, '\\n') + '" > private-key.pem');
    console.log('');
    console.log('🔧 Set environment variable (file path):');
    console.log('$env:SNIPPETBASE_PRIVATE_KEY_FILE = "private-key.pem"');
    console.log('');
    console.log('🔑 Or set environment variable (direct PEM):');
    console.log('$env:SNIPPETBASE_PRIVATE_KEY = "' + privateKeyPem.replace(/\n/g, '\\n') + '"');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('  - Embed the PUBLIC key PEM in src/licensing/license.ts');
    console.log('  - Store the PRIVATE key securely (file or env var)');
    console.log('  - Never commit the private key to version control');

  } catch (error) {
    console.error('Failed to generate keypair:', error);
    console.log('');
    console.log('Note: ECDSA P-256 key generation requires Node.js with crypto support.');
    console.log('If this fails, you may need to update Node.js or check crypto module availability.');
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
