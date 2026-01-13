// scripts/license-verification.test.ts
// Test SnippetBase licensing system (bundled by test-license.mjs)

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Polyfill WebCrypto for Node.js
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = (await import("crypto")).webcrypto;
}

// Import our functions
import { bytesToBase64url, pemToSpkiDer, verifyEcdsaP256 } from '../src/licensing/crypto.ts';
import { parseLicenseToken, verifyLicenseKey, verifyLicenseKeyWithPublicKey } from '../src/licensing/license.ts';

async function generateEphemeralKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export public key to PEM format (SPKI)
  const publicKeySpki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(publicKeySpki).toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  return { keyPair, publicKeyPem };
}

function createTestPayload() {
  return {
    v: 1,
    product: 'snippetbase',
    plan: 'pro',
    licenseId: 'test-license-123',
    issuedAt: Date.now(),
    email: 'test@example.com'
  };
}

function payloadToBase64url(payload: any) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64url(bytes);
}

async function signPayload(payloadB64: string, privateKey: CryptoKey) {
  const message = `SB1.${payloadB64}`;
  const messageBytes = new TextEncoder().encode(message);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    messageBytes
  );

  return bytesToBase64url(new Uint8Array(signature));
}

async function createTestToken(keyPair: CryptoKeyPair) {
  const payload = createTestPayload();
  const payloadB64 = payloadToBase64url(payload);
  const signatureB64 = await signPayload(payloadB64, keyPair.privateKey);

  return `SB1.${payloadB64}.${signatureB64}`;
}

async function testEphemeralKeyVerification() {
  console.log('🧪 Testing ephemeral key verification...');

  try {
    // Generate ephemeral keypair
    const { keyPair, publicKeyPem } = await generateEphemeralKeypair();
    console.log('  ✅ Generated ephemeral ECDSA P-256 keypair');

    // Create test token
    const token = await createTestToken(keyPair);
    console.log('  ✅ Created test token:', token.substring(0, 50) + '...');

    // Verify with ephemeral public key
    const result = await verifyLicenseKeyWithPublicKey(token, publicKeyPem);
    if (result.ok) {
      console.log('  ✅ Token verified successfully');
      console.log('    License ID:', result.licenseId);
      console.log('    Email:', result.email);
    } else {
      throw new Error(`Verification failed: ${result.error}`);
    }

  } catch (error) {
    console.error('  ❌ Ephemeral key test failed:', (error as Error).message);
    throw error;
  }
}

async function testTampering() {
  console.log('🧪 Testing tampering detection...');

  try {
    // Generate ephemeral keypair
    const { keyPair, publicKeyPem } = await generateEphemeralKeypair();

    // Create valid token
    const validToken = await createTestToken(keyPair);

    // Test 1: Tamper with payload
    const parts = validToken.split('.');
    const tamperedPayload = parts[1].replace(/.$/, 'x'); // Change last char
    const tamperedToken1 = `SB1.${tamperedPayload}.${parts[2]}`;

    const result1 = await verifyLicenseKeyWithPublicKey(tamperedToken1, publicKeyPem);
    if (!result1.ok) {
      console.log('  ✅ Payload tampering detected');
    } else {
      throw new Error('Payload tampering not detected');
    }

    // Test 2: Tamper with signature
    const tamperedSig = parts[2].replace(/.$/, 'x'); // Change last char
    const tamperedToken2 = `SB1.${parts[1]}.${tamperedSig}`;

    const result2 = await verifyLicenseKeyWithPublicKey(tamperedToken2, publicKeyPem);
    if (!result2.ok) {
      console.log('  ✅ Signature tampering detected');
    } else {
      throw new Error('Signature tampering not detected');
    }

  } catch (error) {
    console.error('  ❌ Tampering test failed:', (error as Error).message);
    throw error;
  }
}

async function testPrivateFixtures() {
  const fixturesPath = join(process.cwd(), 'tests/fixtures/licenses.private.json');

  if (!existsSync(fixturesPath)) {
    console.log('ℹ️  Private fixtures not found, skipping:', fixturesPath);
    return;
  }

  console.log('🔐 Testing private license fixtures...');

  try {
    const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
    const licenses = fixtures.licenses || [];

    if (licenses.length === 0) {
      console.log('  ℹ️  No licenses in private fixtures');
      return;
    }

    let passed = 0;
    let failed = 0;

    for (const license of licenses) {
      const result = await verifyLicenseKey(license.token);
      if (result.ok) {
        passed++;
        console.log(`  ✅ ${license.licenseId} (${license.identity || 'no identity'})`);
      } else {
        failed++;
        console.log(`  ❌ ${license.licenseId}: ${result.error}`);
        console.log(`     Token: ${license.token.substring(0, 30)}...`);
        console.log(`     Generated: ${new Date(license.generatedAt).toISOString()}`);
      }
    }

    console.log(`  📊 Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      throw new Error(`${failed} private fixture licenses failed verification - DO NOT DEPLOY!`);
    }

  } catch (error) {
    console.error('  ❌ Private fixtures test failed:', (error as Error).message);
    throw error;
  }
}

async function runBundledTests() {
  console.log('=== SnippetBase License Testing ===\n');

  try {
    await testEphemeralKeyVerification();
    console.log('');

    await testTampering();
    console.log('');

    await testPrivateFixtures();
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('\n❌ Tests failed:', (error as Error).message);
    process.exit(1);
  }
}

runBundledTests();
