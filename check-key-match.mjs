#!/usr/bin/env node

import { createPrivateKey } from 'crypto';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgr1TDXo7XQx5LSV0A
FlQY4Xs7biHzwNwul31En01Ggu6hRANCAASBh5m0rLTerLtNPhdIVSXlqBaFFWnC
1iBEhzoGkIYvXDr1Qjbu3RH1XhtjxxB/7TWISH0PM8bA15/noV49RKyr
-----END PRIVATE KEY-----`;

try {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKeyPem = privateKey.export({
    format: 'pem',
    type: 'spki'
  });

  console.log('Public key for license.ts:');
  console.log(publicKeyPem);
} catch (error) {
  console.error('Error:', error.message);
}
