#!/usr/bin/env node

// Get the public key from the current private key in generate-license.mjs
import { readFileSync } from 'fs';
import { createPrivateKey } from 'crypto';

const generateJs = readFileSync('generate-license.mjs', 'utf8');
const privateKeyMatch = generateJs.match(/const PRIVATE_KEY_PEM = `([\s\S]*?)`;/);
const privateKeyPem = privateKeyMatch?.[1];

if (!privateKeyPem) {
  console.error('Could not find private key in generate-license.mjs');
  process.exit(1);
}

console.log('Found private key, deriving public key...');

try {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKeyPem = privateKey.export({
    format: 'pem',
    type: 'spki'
  });

  console.log('\n=== PUBLIC KEY FOR license.ts ===');
  console.log(publicKeyPem);
  console.log('==================================');

} catch (error) {
  console.log('Error extracting public key. The key format might be wrong.');
  console.log('Let me try a different approach...');

  // For ECDSA keys, the public key is embedded in the private key
  // Let's manually extract it from the PKCS#8 format

  try {
    const privateKeyBytes = Buffer.from(privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, ''), 'base64');

    // For ECDSA PKCS#8, the public key is at the end
    // Skip the private key part and get the public key
    // This is a rough extraction - the format is complex

    console.log('Private key length:', privateKeyBytes.length);
    console.log('This is tricky. Let me try to reconstruct manually.');

    // For P-256, the public key is 64 bytes (x,y coordinates)
    // Let's try to find it in the private key structure
    // PKCS#8 format: version + algorithm + private key + public key

    // The public key part starts with 0xA1, then length, then 0x04, then 64 bytes
    const pubKeyStart = privateKeyBytes.indexOf(0xA1);
    if (pubKeyStart !== -1) {
      const pubKeyData = privateKeyBytes.slice(pubKeyStart + 4, pubKeyStart + 4 + 64);
      console.log('Found potential public key data, length:', pubKeyData.length);

      // Convert to SPKI format
      const spki = Buffer.concat([
        Buffer.from([0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01, 0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04]),
        pubKeyData
      ]);

      const spkiB64 = spki.toString('base64');
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${spkiB64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

      console.log('\n=== EXTRACTED PUBLIC KEY ===');
      console.log(publicKeyPem);
      console.log('============================');
    }

  } catch (e) {
    console.log('Manual extraction failed too. Let me provide a working solution.');
  }
}
