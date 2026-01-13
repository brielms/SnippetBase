#!/usr/bin/env node

// Extract public key from private key PEM
import { createPrivateKey } from 'crypto';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgN56IuI0Xan58YUGs
zL6CMCvdArTFUZmdIl8J8nYaQNWhRANCAASg1+n0RGObPdiXzkJabW8ZCY0Ootlf
rFByDr/LCNLBe9Rcof4OFM2yR7TTCjPxqdw5ArUOO1/lwolrb8LVYvs0
-----END PRIVATE KEY-----`;

try {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKeyPem = privateKey.export({
    format: 'pem',
    type: 'spki'
  });

  console.log('Add this PUBLIC key to src/licensing/license.ts:');
  console.log('='.repeat(50));
  console.log(publicKeyPem);
  console.log('='.repeat(50));
} catch (error) {
  console.error('Error extracting public key:', error.message);
  console.log('Trying alternative method...');

  // Alternative: use key generation with the same private key
  // This is a workaround since export might not work in all Node versions
  console.log('Please run: node setup-license-generator.mjs');
  console.log('It will show you the correct public key to use.');
}
