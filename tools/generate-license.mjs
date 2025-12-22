#!/usr/bin/env node

// tools/generate-license.mjs
// Generate SnippetBase Pro License Key (SB1 token)
// Run with: node tools/generate-license.mjs <licenseId> [email] [note]

import { sign } from 'crypto';
import { readFileSync } from 'fs';

// Get private key from environment or file
const privateKeyB64 = process.env.SNIPPETBASE_PRIVATE_KEY ||
  (() => {
    try {
      return readFileSync('private-key.txt', 'utf8').trim();
    } catch {
      console.error('Private key not found!');
      console.error('Set SNIPPETBASE_PRIVATE_KEY env var or create private-key.txt file');
      console.error('Example: $env:SNIPPETBASE_PRIVATE_KEY = "UNGZufuwkANQZ1xFCtPcls4l-Ta_u8pNVhObknh-Jb8"');
      process.exit(1);
    }
  })();

// Convert raw 32-byte Ed25519 private key to PKCS8 PEM format
function rawPrivateKeyToPem(rawKeyBase64) {
  const rawKeyBytes = Buffer.from(rawKeyBase64, 'base64');
  if (rawKeyBytes.length !== 32) {
    throw new Error('Invalid Ed25519 private key length');
  }

  // PKCS8 format for Ed25519 private key
  // OID for Ed25519: 1.3.101.112
  // DER encoding: 30 (sequence) + length + 02 01 00 (version) + 30 (sequence) + 05 (length) + 06 03 2B 65 70 (OID) + 04 22 (octet string + length) + 04 20 (octet string + length) + key bytes
  const pkcs8Header = Buffer.from([
    0x30, 0x2E, // sequence, length 46
    0x02, 0x01, 0x00, // version
    0x30, 0x05, // sequence, length 5
    0x06, 0x03, 0x2B, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
    0x04, 0x22, // octet string, length 34
    0x04, 0x20  // octet string, length 32
  ]);

  const pkcs8 = Buffer.concat([pkcs8Header, rawKeyBytes]);
  return `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString('base64')}\n-----END PRIVATE KEY-----`;
}

if (process.argv.length < 3) {
  console.error('Usage: node tools/generate-license.mjs <licenseId> [email|buyerId] [seats]');
  console.error('Example: node tools/generate-license.mjs "user-123" "user@example.com" 2');
  console.error('Example: node tools/generate-license.mjs "user-456" "buyer-789"');
  process.exit(1);
}

const licenseId = process.argv[2];
const identity = process.argv[3]; // can be email or buyerId
const seatsArg = process.argv[4];
const seats = seatsArg ? parseInt(seatsArg, 10) : 1;

if (seatsArg && (isNaN(seats) || seats < 1)) {
  console.error('Seats must be a positive integer');
  process.exit(1);
}

async function generateLicense() {
  try {
    // Convert raw private key to PEM format
    const privateKeyPem = rawPrivateKeyToPem(privateKeyB64);

    // Create license payload
    const payload = {
      v: 1,
      product: 'snippetbase',
      plan: 'pro',
      licenseId,
      issuedAt: Date.now(),
      seats,
    };

    // Determine if identity is email or buyerId
    if (identity) {
      if (identity.includes('@')) {
        payload.email = identity;
      } else {
        payload.buyerId = identity;
      }
    }

    // Serialize payload
    const payloadJson = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadJson);
    const payloadB64 = base64urlEncode(payloadBytes);

    // Create message to sign
    const message = `SB1.${payloadB64}`;

    // Sign the message using Node.js crypto
    const signature = sign(null, Buffer.from(message), privateKeyPem);
    const signatureB64 = base64urlEncode(signature);

    // Create final token
    const token = `SB1.${payloadB64}.${signatureB64}`;

    console.log('=== SnippetBase Pro License Key ===');
    console.log('');
    console.log('License ID:', licenseId);
    console.log('Identity:', identity || 'none');
    console.log('Seats:', seats);
    console.log('Issued:', new Date(payload.issuedAt).toISOString());
    console.log('');
    console.log('License Key:');
    console.log(token);
    console.log('');
    console.log('This key enables Pro features immediately when entered in settings.');

  } catch (error) {
    console.error('Failed to generate license:', error);
  }
}

function base64urlDecode(str) {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return Uint8Array.from(Buffer.from(padded, 'base64'));
}

function base64urlEncode(bytes) {
  const base64 = Buffer.from(bytes).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

generateLicense();
