#!/usr/bin/env node

import { generateKeyPairSync, createSign } from 'crypto';

// Generate test keypair
const { publicKey: testPublicKeyPem, privateKey: testPrivateKeyPem } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Test data
const licensePayload = JSON.stringify({
  v: 1,
  product: 'snippetbase',
  plan: 'pro',
  licenseId: 'test-license-1',
  issuedAt: 1640995200000,
  email: 'test@example.com',
  seats: 2
});
const licensePayloadB64 = Buffer.from(licensePayload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// Sign the message
const message = `SB1.${licensePayloadB64}`;
const sign = createSign('SHA256');
sign.update(message);
const signature = sign.sign(testPrivateKeyPem, 'base64url');

// Create token
const token = `SB1.${licensePayloadB64}.${signature}`;

console.log('✅ Generated test token successfully');
console.log('Token length:', token.length);
console.log('Token starts with:', token.substring(0, 50) + '...');

// Now test verification
import('./src/licensing/license.js').then(async (licenseModule) => {
  const result = await licenseModule.verifyLicenseKeyWithPublicKey(token, testPublicKeyPem);
  if (result.ok) {
    console.log('✅ Verification PASSED');
    console.log('License ID:', result.licenseId);
    console.log('Email:', result.email);
    console.log('Seats:', result.seats);
  } else {
    console.log('❌ Verification FAILED:', result.error);
  }
}).catch(err => {
  console.error('❌ Import failed:', err.message);
});
