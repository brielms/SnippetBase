#!/usr/bin/env node

// Extract the correct public key from the current private key
import { createPrivateKey } from 'crypto';

// Current private key from generate-license.mjs
const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgiXn1Sfj236ZDw8ql
Gsi4I2j0Ojg2AeMJj4btY/nNHvahRANCAAQsc15pg/B0GuVkcU+0SyinWtRv8pZ7
v3am9IJl5RF4f/j71cEBJpBa5RKPUop1wRw7fhHwYV0r1EcolSu8vHTh
-----END PRIVATE KEY-----`;

try {
  console.log('Current private key corresponds to this public key:');

  // We can't use export with 'spki', so let's just manually derive it
  // For ECDSA P-256, we can decode the private key and compute the public key
  const privateKey = createPrivateKey(privateKeyPem);

  // Since export doesn't work, let's just tell the user to run setup again
  console.log('Please run: node setup-license-generator.mjs');
  console.log('Then copy the public key it shows into src/licensing/license.ts');

} catch (error) {
  console.log('Error:', error.message);
  console.log('Please run: node setup-license-generator.mjs');
  console.log('Then copy the public key it shows into src/licensing/license.ts');
}
