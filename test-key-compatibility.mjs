#!/usr/bin/env node

// Test key compatibility between generation and verification
import { createSign, createPrivateKey } from 'crypto';
import { pemToDer, verifyEcdsaP256Spki } from './src/licensing/crypto.ts';

// Use the same private key as in generate-license.mjs
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgsvF/h3aPH1NlOXmh
98OYMKGWDOuwsKf/GKZQbF7IuKihRANCAAQImm3ru+3cgfSgV/0nMZZC6sB+uc/0
Nhun5Kw7XXUx3uQoeil14o+TOFy5WJzUY/L7p1jwsZtPCZ/3TXPWjfUc
-----END PRIVATE KEY-----`;

// Use the same public key as in license.ts
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAECJpt67vt3IH0oFf9JzGWQurAfrnP
9DYbp+SsO111Md7kKHopdeKPkzhcuVic1GPy+6dY8LGbTwmf901z1o31HA==
-----END PUBLIC KEY-----`;

async function testKeyCompatibility() {
  console.log('Testing key compatibility...\n');

  // Test message
  const testMessage = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdCIsImlzc3VlZEF0IjoxMjM0NTY3ODkwLCJzZWF0cyI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0';
  console.log('Test message:', testMessage);

  try {
    // Sign with Node.js
    const sign = createSign('SHA256');
    sign.update(testMessage);
    const signatureDer = sign.sign(PRIVATE_KEY_PEM);
    console.log('Node.js signature length:', signatureDer.length);
    console.log('Node.js signature first byte:', signatureDer[0]);

    // Convert to base64url for JWT
    const signatureB64 = signatureDer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    console.log('JWT signature length:', signatureB64.length);

    // Decode back to bytes for verification
    const signatureBytes = Buffer.from(signatureB64, 'base64');
    console.log('Decoded signature length:', signatureBytes.length);

    // Verify with WebCrypto-style function
    const publicKeyDer = pemToDer(PUBLIC_KEY_PEM);
    const messageBytes = new TextEncoder().encode(testMessage);

    console.log('Public key DER length:', publicKeyDer.length);
    console.log('Message bytes length:', messageBytes.length);

    const isValid = await verifyEcdsaP256Spki(publicKeyDer, messageBytes, signatureBytes);
    console.log('Verification result:', isValid);

    if (isValid) {
      console.log('✅ Keys are compatible!');
    } else {
      console.log('❌ Keys are NOT compatible - signature verification failed');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testKeyCompatibility();
