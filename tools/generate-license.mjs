#!/usr/bin/env node

// tools/generate-license.mjs
// Generate SnippetBase Pro License Key (SB1 token)
// Run with: node tools/generate-license.mjs <licenseId> [email|buyerId] [seats]

import { createSign } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Normalize base64url to base64
function normalizeBase64(input) {
  // Convert base64url to base64
  return input.replace(/-/g, '+').replace(/_/g, '/');
}

// Load private key from file
let privateKeyPem;

try {
  console.log('Loading private key from private-key.pem...');
  privateKeyPem = readFileSync('private-key.pem', 'utf8').trim();
  console.log('✅ Private key loaded (', privateKeyPem.length, 'characters)');

  if (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Invalid PEM format - file must contain ECDSA private key in PEM format');
  }
} catch (error) {
  console.error('❌ Failed to load private key!');
  console.error('Error:', error.message);
  console.error('');
  console.error('Make sure private-key.pem exists in the current directory.');
  console.error('Generate it with: node tools/generate-keypair.mjs > keypair.txt');
  console.error('Then copy the private key PEM to private-key.pem');
  process.exit(1);
}

// Sign payload using ECDSA private key
function signPayload(payload, privateKeyPem) {
  const sign = createSign('SHA256');
  sign.update(payload);
  return sign.sign(privateKeyPem, 'base64url');
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
    const payloadB64 = Buffer.from(payloadJson).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Create message to sign
    const message = `SB1.${payloadB64}`;

    // Sign the message using ECDSA
    const signatureB64 = signPayload(message, privateKeyPem);

    // Create final token
    const token = `SB1.${payloadB64}.${signatureB64}`;

    // Save to private test fixtures (for regression testing)
    saveLicenseToFixtures({
      licenseId,
      identity,
      seats,
      issuedAt: payload.issuedAt,
      token,
      generatedAt: Date.now()
    });

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
    console.log('✅ License saved to test fixtures for regression testing.');

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

// Save license to private test fixtures for regression testing
function saveLicenseToFixtures(licenseInfo) {
  const fixturesPath = join(process.cwd(), 'tests/fixtures/licenses.private.json');

  let fixtures = { licenses: [] };

  // Load existing fixtures if they exist
  if (existsSync(fixturesPath)) {
    try {
      fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not read existing fixtures file, starting fresh');
    }
  }

  // Check if this license ID already exists (avoid duplicates)
  const existingIndex = fixtures.licenses.findIndex(l => l.licenseId === licenseInfo.licenseId);
  if (existingIndex >= 0) {
    // Update existing license
    fixtures.licenses[existingIndex] = licenseInfo;
    console.log(`Updated existing license for ${licenseInfo.licenseId} in fixtures`);
  } else {
    // Add new license
    fixtures.licenses.push(licenseInfo);
    console.log(`Added new license for ${licenseInfo.licenseId} to fixtures`);
  }

  // Save fixtures file
  try {
    writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
  } catch (error) {
    console.warn('Warning: Could not save fixtures file:', error.message);
  }
}

generateLicense();
