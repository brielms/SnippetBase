// tests/license.test.ts
// Tests for SnippetBase Pro licensing system

import { parseLicenseToken, verifyLicenseKey, verifyLicenseKeyWithPublicKey } from '../src/licensing/license';
import { generateKeyPairSync } from 'crypto';

// Generate a test keypair for real signature testing
let testPublicKeyPem: string;
let testPrivateKeyPem: string;

try {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  testPublicKeyPem = publicKey;
  testPrivateKeyPem = privateKey;
} catch (error) {
  console.error('Failed to generate test keypair:', error);
  process.exit(1);
}

// Sign payload using test private key
function signTestPayload(payload: string, privateKeyPem: string) {
  const { createSign } = require('crypto');
  const sign = createSign('SHA256');
  sign.update(payload);
  return sign.sign(privateKeyPem, 'base64url');
}

// Export for module usage
export { testLicenseSystem };

// Test data - valid JSON payloads encoded as base64url
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

const licensePayloadBuyerId = JSON.stringify({
  v: 1,
  product: 'snippetbase',
  plan: 'pro',
  licenseId: 'test-license-2',
  issuedAt: 1640995200000,
  buyerId: 'buyer-123',
  seats: 1
});
const licensePayloadBuyerIdB64 = Buffer.from(licensePayloadBuyerId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// Generate real signed tokens for testing
const message1 = `SB1.${licensePayloadB64}`;
const signature1 = signTestPayload(message1, testPrivateKeyPem);
const validSignedLicenseKey = `SB1.${licensePayloadB64}.${signature1}`;

const message2 = `SB1.${licensePayloadBuyerIdB64}`;
const signature2 = signTestPayload(message2, testPrivateKeyPem);
const validSignedLicenseKeyBuyerId = `SB1.${licensePayloadBuyerIdB64}.${signature2}`;

// Tampered token (flip one character in payload)
const tamperedPayloadB64 = licensePayloadB64.substring(0, 10) + 'X' + licensePayloadB64.substring(11);
const tamperedLicenseKey = `SB1.${tamperedPayloadB64}.${signature1}`;

const invalidLicenseKey = 'SB1.invalid-payload.invalid-signature';
const wrongProductLicenseKey = `SB1.${Buffer.from(JSON.stringify({
  v: 1,
  product: 'wrong',
  plan: 'pro',
  licenseId: 'test-license-1',
  issuedAt: 1640995200000
})).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}.invalid-signature`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testLicenseTokenParsing() {
  console.log('Testing license token parsing...');

  // Test valid SB1 license key with email
  const result1 = parseLicenseToken(validLicenseKey);
  assert(result1 !== null, 'Should parse valid SB1 license key');
  assert(result1!.prefix === 'SB1', 'Should have SB1 prefix');
  assert(result1!.payload.v === 1, 'SB1 payload should have v=1');
  assert(result1!.payload.product === 'snippetbase', 'SB1 payload should have correct product');
  assert(result1!.payload.plan === 'pro', 'SB1 payload should have plan=pro');
  assert(result1!.payload.licenseId === 'test-license-1', 'SB1 payload should have correct licenseId');
  assert(result1!.payload.email === 'test@example.com', 'SB1 payload should have email');
  assert(result1!.payload.seats === 2, 'SB1 payload should have seats');

  // Test valid SB1 license key with buyerId
  const result2 = parseLicenseToken(validLicenseKeyBuyerId);
  assert(result2 !== null, 'Should parse valid SB1 license key with buyerId');
  assert(result2!.prefix === 'SB1', 'Should have SB1 prefix');
  assert(result2!.payload.buyerId === 'buyer-123', 'SB1 payload should have buyerId');
  assert(result2!.payload.seats === 1, 'SB1 payload should have default seats');

  // Test invalid token format
  const result3 = parseLicenseToken('invalid-token');
  assert(result3 === null, 'Should reject invalid token format');

  // Test wrong prefix
  const result4 = parseLicenseToken('INVALID.xxxx.xxxx');
  assert(result4 === null, 'Should reject wrong prefix');

  // Test SBA1 prefix (should be rejected now)
  const result5 = parseLicenseToken('SBA1.xxxx.xxxx');
  assert(result5 === null, 'Should reject SBA1 prefix');

  console.log('License token parsing tests passed! ✓');
}

async function testLicenseKeyVerification() {
  console.log('Testing license key verification...');

  // Test valid signed license key
  const result1 = await verifyLicenseKeyWithPublicKey(validSignedLicenseKey, testPublicKeyPem);
  assert(result1.ok === true, 'Should accept valid signed license');
  assert(result1.licenseId === 'test-license-1', 'Should return correct licenseId');
  assert(result1.email === 'test@example.com', 'Should return correct email');
  assert(result1.seats === 2, 'Should return correct seats');

  // Test valid signed license key with buyerId
  const result1b = await verifyLicenseKeyWithPublicKey(validSignedLicenseKeyBuyerId, testPublicKeyPem);
  assert(result1b.ok === true, 'Should accept valid signed license with buyerId');
  assert(result1b.licenseId === 'test-license-2', 'Should return correct licenseId');
  assert(result1b.buyerId === 'buyer-123', 'Should return correct buyerId');
  assert(result1b.seats === 1, 'Should return correct seats');

  // Test tampered payload (signature verification should fail)
  const result2 = await verifyLicenseKeyWithPublicKey(tamperedLicenseKey, testPublicKeyPem);
  assert(result2.ok === false, 'Should reject tampered license');
  assert(result2.error === 'Invalid signature', 'Should return invalid signature error');

  // Test invalid token format (fails before signature check)
  const result3 = await verifyLicenseKeyWithPublicKey(invalidLicenseKey, testPublicKeyPem);
  assert(result3.ok === false, 'Should reject invalid token format');
  assert(result3.error === 'Invalid token format', 'Should return correct error message');

  // Test wrong product (fails before signature check)
  const result4 = await verifyLicenseKeyWithPublicKey(wrongProductLicenseKey, testPublicKeyPem);
  assert(result4.ok === false, 'Should reject wrong product');
  assert(result4.error === 'Invalid license payload', 'Should return correct error message');

  // Test embedded key verification (should fail since we're using test keys, not embedded keys)
  const result5 = await verifyLicenseKey(validSignedLicenseKey);
  assert(result5.ok === false, 'Should reject license signed with test key when using embedded key');
  assert(result5.error === 'Invalid signature', 'Should return invalid signature error');

  console.log('License key verification tests passed! ✓');
}



async function testLicenseSystem() {
  console.log('Running SnippetBase Pro license system tests...\n');

  testLicenseTokenParsing();
  await testLicenseKeyVerification();

  console.log('\nAll license system tests passed! ✓');
}

// Export for module usage or run directly
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('license.test.ts')) {
  testLicenseSystem();
}
