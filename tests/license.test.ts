// tests/license.test.ts
// Tests for SnippetBase Pro licensing system

import { parseToken, verifyLicenseKey, getDeviceFingerprint, shouldShowDeviceBindingWarning } from '../src/licensing/license';

// Mock crypto for deterministic testing
const mockCrypto = {
  subtle: {
    verify: async () => true, // Mock successful verification for tests
    importKey: async () => ({}), // Mock key import
  },
};

// Test data - simple valid JSON payloads encoded as base64url
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

const validLicenseKey = `SB1.${licensePayloadB64}.mock-signature`;
const validLicenseKeyBuyerId = `SB1.${licensePayloadBuyerIdB64}.mock-signature`;
const invalidLicenseKey = 'SB1.invalid-payload.mock-signature';
const wrongProductLicenseKey = `SB1.${Buffer.from(JSON.stringify({
  v: 1,
  product: 'wrong',
  plan: 'pro',
  licenseId: 'test-license-1',
  issuedAt: 1640995200000
})).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}.mock-signature`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testLicenseTokenParsing() {
  console.log('Testing license token parsing...');

  // Test valid SB1 license key with email
  const result1 = parseToken(validLicenseKey);
  assert(result1 !== null, 'Should parse valid SB1 license key');
  assert(result1!.prefix === 'SB1', 'Should have SB1 prefix');
  assert(result1!.payload.v === 1, 'SB1 payload should have v=1');
  assert(result1!.payload.product === 'snippetbase', 'SB1 payload should have correct product');
  assert(result1!.payload.plan === 'pro', 'SB1 payload should have plan=pro');
  assert(result1!.payload.licenseId === 'test-license-1', 'SB1 payload should have correct licenseId');
  assert(result1!.payload.email === 'test@example.com', 'SB1 payload should have email');
  assert(result1!.payload.seats === 2, 'SB1 payload should have seats');

  // Test valid SB1 license key with buyerId
  const result2 = parseToken(validLicenseKeyBuyerId);
  assert(result2 !== null, 'Should parse valid SB1 license key with buyerId');
  assert(result2!.prefix === 'SB1', 'Should have SB1 prefix');
  assert(result2!.payload.buyerId === 'buyer-123', 'SB1 payload should have buyerId');
  assert(result2!.payload.seats === 1, 'SB1 payload should have default seats');

  // Test invalid token format
  const result3 = parseToken('invalid-token');
  assert(result3 === null, 'Should reject invalid token format');

  // Test wrong prefix
  const result4 = parseToken('INVALID.xxxx.xxxx');
  assert(result4 === null, 'Should reject wrong prefix');

  // Test SBA1 prefix (should be rejected now)
  const result5 = parseToken('SBA1.xxxx.xxxx');
  assert(result5 === null, 'Should reject SBA1 prefix');

  console.log('License token parsing tests passed! ✓');
}

async function testLicenseKeyVerification() {
  console.log('Testing license key verification...');

  // Test valid license key with email
  const result1 = await verifyLicenseKey(validLicenseKey);
  assert(result1.ok === true, 'Should verify valid license key');
  assert(result1.licenseId === 'test-license-1', 'Should return correct licenseId');
  assert(result1.email === 'test@example.com', 'Should return email');
  assert(result1.seats === 2, 'Should return seats');

  // Test valid license key with buyerId
  const result1b = await verifyLicenseKey(validLicenseKeyBuyerId);
  assert(result1b.ok === true, 'Should verify valid license key with buyerId');
  assert(result1b.buyerId === 'buyer-123', 'Should return buyerId');
  assert(result1b.seats === 1, 'Should return default seats');

  // Test invalid token format
  const result2 = await verifyLicenseKey(invalidLicenseKey);
  assert(result2.ok === false, 'Should reject invalid token format');
  assert(result2.error === 'Invalid token format', 'Should return correct error message');

  // Test wrong product
  const result3 = await verifyLicenseKey(wrongProductLicenseKey);
  assert(result3.ok === false, 'Should reject wrong product');
  assert(result3.error === 'Invalid license payload', 'Should return correct error message');

  console.log('License key verification tests passed! ✓');
}

function testDeviceBindingLogic() {
  console.log('Testing device binding logic...');

  // Test should show warning when device hashes differ
  const result1 = shouldShowDeviceBindingWarning('device-hash-1', 'device-hash-2', false);
  assert(result1 === true, 'Should show warning when device hashes differ and not suppressed');

  // Test should not show warning when suppressed
  const result2 = shouldShowDeviceBindingWarning('device-hash-1', 'device-hash-2', true);
  assert(result2 === false, 'Should not show warning when suppressed');

  // Test should not show warning when no bound device
  const result3 = shouldShowDeviceBindingWarning(undefined, 'device-hash-2', false);
  assert(result3 === false, 'Should not show warning when no bound device hash');

  // Test should not show warning when hashes match
  const result4 = shouldShowDeviceBindingWarning('device-hash-1', 'device-hash-1', false);
  assert(result4 === false, 'Should not show warning when device hashes match');

  console.log('Device binding logic tests passed! ✓');
}

async function testDeviceFingerprinting() {
  console.log('Testing device fingerprinting...');

  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  // Mock process for consistent results
  (global as any).process = {
    platform: 'test-platform',
    release: { name: 'test-release' },
  };

  // Test consistent hashing
  const hash1 = await getDeviceFingerprint(salt);
  const hash2 = await getDeviceFingerprint(salt);
  assert(hash1 === hash2, 'Should generate consistent device hash');
  assert(typeof hash1 === 'string', 'Device hash should be a string');
  assert(hash1.length === 64, 'Device hash should be 64 characters (SHA256 hex)');

  // Test different salts produce different hashes
  const salt2 = new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  const hash3 = await getDeviceFingerprint(salt2);
  assert(hash1 !== hash3, 'Different salts should produce different hashes');

  console.log('Device fingerprinting tests passed! ✓');
}

async function testLicenseSystem() {
  console.log('Running SnippetBase Pro license system tests...\n');

  testLicenseTokenParsing();
  await testLicenseKeyVerification();
  testDeviceBindingLogic();
  await testDeviceFingerprinting();

  console.log('\nAll license system tests passed! ✓');
}

// Export for module usage or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testLicenseSystem };
} else {
  testLicenseSystem();
}
