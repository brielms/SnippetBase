#!/usr/bin/env node

// Verify that private and public keys match
import { createPrivateKey } from 'crypto';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgPpwt7tdAqaZn3LKl
bmThrFP5soYluBnz9RJ4lYw5d/ShRANCAAQImm3ru+3cgfSgV/0nMZZC6sB+uc/0
Nhun5Kw7XXUx3uQoeil14o+TOFy5WJzUY/L7p1jwsZtPCZ/3TXPWjfUc
-----END PRIVATE KEY-----`;

const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAECJpt67vt3IH0oFf9JzGWQurAfrnP
9DYbp+SsO111Md7kKHopdeKPkzhcuVic1GPy+6dY8LGbTwmf901z1o31HA==
-----END PUBLIC KEY-----`;

try {
  const privateKey = createPrivateKey(privateKeyPem);
  const derivedPublicKey = privateKey.export({ format: 'pem', type: 'spki' });

  console.log('Private key in generate-license.mjs corresponds to:');
  console.log(derivedPublicKey);
  console.log('\nPublic key currently in license.ts:');
  console.log(publicKeyPem);
  console.log('\nDo they match?', derivedPublicKey.trim() === publicKeyPem.trim());
} catch (error) {
  console.error('Error:', error.message);
}
