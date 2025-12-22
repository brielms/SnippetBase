#!/usr/bin/env node

// Verify that private key corresponds to public key
import { createPrivateKey } from 'crypto';

// Private key from generate-license.mjs
const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgsvF/h3aPH1NlOXmh
98OYMKGWDOuwsKf/GKZQbF7IuKihRANCAAQImm3ru+3cgfSgV/0nMZZC6sB+uc/0
Nhun5Kw7XXUx3uQoeil14o+TOFy5WJzUY/L7p1jwsZtPCZ/3TXPWjfUc
-----END PRIVATE KEY-----`;

// Public key from license.ts
const publicKeyPemExpected = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAECJpt67vt3IH0oFf9JzGWQurAfrnP
9DYbp+SsO111Md7kKHopdeKPkzhcuVic1GPy+6dY8LGbTwmf901z1o31HA==
-----END PUBLIC KEY-----`;

try {
  const privateKey = createPrivateKey(privateKeyPem);
  const derivedPublicKey = privateKey.export({
    format: 'pem',
    type: 'spki'
  });

  console.log('Expected public key:');
  console.log(publicKeyPemExpected);
  console.log('\nDerived public key from private key:');
  console.log(derivedPublicKey);
  console.log('\nDo they match?', derivedPublicKey.trim() === publicKeyPemExpected.trim());

  if (derivedPublicKey.trim() !== publicKeyPemExpected.trim()) {
    console.log('\n❌ KEYS DO NOT MATCH! The private key does not correspond to the public key.');
    console.log('This explains why signature verification fails.');
  } else {
    console.log('\n✅ Keys match correctly.');
  }

} catch (error) {
  console.error('Error:', error.message);
}
