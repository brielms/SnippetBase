import { sign } from 'crypto';

// Test signature format
const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEID4n+Gge27Nm/30tpjjrdcIoq6EZPms9g1/93z6JO0m3
-----END PRIVATE KEY-----`;

const message = 'SB1.test';
const signature = sign(null, Buffer.from(message), privateKeyPem);
console.log('Node.js signature length:', signature.length);
console.log('Node.js signature (hex):', signature.toString('hex'));
console.log('Node.js signature (base64):', signature.toString('base64'));
