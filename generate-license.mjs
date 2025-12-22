#!/usr/bin/env node

// generate-license.mjs
// Single-command license generator for SnippetBase Pro
// Run: node generate-license.mjs <licenseId> [email|buyerId] [seats]

import { generateKeyPairSync, createSign } from 'crypto';

// Hardcoded private key for license generation
// Replace this with your own keypair from: node tools/generate-keypair.mjs
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgqySMjWeIqXKzC2p7
w5JRX4eSMpzd+GLkTlzq/rC4iw2hRANCAARvvoDnj6q9xFjgSqD7FPpm+HbIS7Ab
w2RiG9eu+FMEncGNv7NgfoQ/CPEGqRV5pE4aAE24nYGmYTB9dWl/VUaf
-----END PRIVATE KEY-----
`;

// Sign payload using RSA private key
function signPayload(payload, privateKeyPem) {
  const sign = createSign('SHA256');
  sign.update(payload);
  const signature = sign.sign(privateKeyPem, 'base64url');
  return signature;
}

// Base64url encode
function base64urlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateLicense() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-license.mjs <licenseId> [email|buyerId] [seats]');
    console.error('Examples:');
    console.error('  node generate-license.mjs "user-123"');
    console.error('  node generate-license.mjs "user-456" "user@example.com" 2');
    console.error('  node generate-license.mjs "buyer-789" "company-id"');
    process.exit(1);
  }

  const licenseId = args[0];
  const identity = args[1];
  const seats = args[2] ? parseInt(args[2], 10) : 1;

  if (args[2] && (isNaN(seats) || seats < 1)) {
    console.error('Seats must be a positive integer');
    process.exit(1);
  }

  // Create license payload
  const payload = {
    v: 1,
    product: 'snippetbase',
    plan: 'pro',
    licenseId,
    issuedAt: Date.now(),
    seats,
  };

  // Add identity if provided
  if (identity) {
    if (identity.includes('@')) {
      payload.email = identity;
    } else {
      payload.buyerId = identity;
    }
  }

  // Serialize payload
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadJson);

    // Create message to sign
    const message = `SB1.${payloadB64}`;

    // Sign the message
    const signatureB64 = signPayload(message, PRIVATE_KEY_PEM);

  // Create final token
  const token = `SB1.${payloadB64}.${signatureB64}`;

  console.log('=== SnippetBase Pro License Key ===\n');
  console.log(`License ID: ${licenseId}`);
  console.log(`Identity: ${identity || 'none'}`);
  console.log(`Seats: ${seats}`);
  console.log(`Issued: ${new Date(payload.issuedAt).toISOString()}\n`);
  console.log('License Key:');
  console.log(token);
  console.log('\n✅ Copy this key into SnippetBase settings to enable Pro features!');
}

generateLicense();
