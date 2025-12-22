#!/usr/bin/env node

// Test the generated license key against our licensing system
const generatedToken = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdC11c2VyLTEyMyIsImlzc3VlZEF0IjoxNzY2NDI4Nzg2Mzc3LCJzZWF0cyI6MiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.MEUCIQCf_ErusizI4l3jM-pDzFqdkIJ-n7iYh2mM2k74QRiosQIgRiEw0Rkn4Fyt6uDB0PNIYTQo2w3bkMi4wKLCTbnj3BU';

// Import our crypto functions
import { pemToDer, verifyEcdsaP256Spki } from './src/licensing/crypto.ts';
import { parseToken } from './src/licensing/license.ts';

// The embedded public key
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtyw9YsEQvoF3BWvHJViuLXJYTrGz
iwr0qQRaevUZcg5pYoCIrGaDgNVXNhCL8tWdk4q5ZseuqgBPxFmGHkGY+A==
-----END PUBLIC KEY-----`;

async function testVerification() {
  try {
    console.log('Testing license verification...');

    // Parse the token
    const parsed = parseToken(generatedToken);
    if (!parsed) {
      console.error('❌ Failed to parse token');
      return;
    }

    console.log('✅ Token parsed successfully');
    console.log('License ID:', parsed.payload.licenseId);
    console.log('Email:', parsed.payload.email);
    console.log('Seats:', parsed.payload.seats);

    // Verify the signature
    const publicKeySpki = pemToDer(PUBLIC_KEY_PEM);
    const message = `SB1.${parsed.payloadB64}`;
    const messageBytes = new TextEncoder().encode(message);

    const isValid = await verifyEcdsaP256Spki(publicKeySpki, messageBytes, parsed.sig);

    if (isValid) {
      console.log('✅ Signature verification PASSED');
      console.log('🎉 License system is working correctly!');
    } else {
      console.log('❌ Signature verification FAILED');
    }

    // Test with tampered token
    console.log('\nTesting tampered token...');
    const tamperedToken = generatedToken.replace('test-user-123', 'hacked-user');
    const tamperedParsed = parseToken(tamperedToken);
    if (tamperedParsed) {
      const tamperedMessage = `SB1.${tamperedParsed.payloadB64}`;
      const tamperedMessageBytes = new TextEncoder().encode(tamperedMessage);
      const tamperedValid = await verifyEcdsaP256Spki(publicKeySpki, tamperedMessageBytes, tamperedParsed.sig);

      if (!tamperedValid) {
        console.log('✅ Tampered token correctly rejected');
      } else {
        console.log('❌ Tampered token incorrectly accepted');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testVerification();
