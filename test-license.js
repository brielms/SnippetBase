// Quick test of license verification
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = (await import('crypto')).webcrypto;
}

// Test license key
const licenseKey = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdC11c2VyLTEyMyIsImlzc3VlZEF0IjoxNzY2NDMyNzYwMTkyLCJzZWF0cyI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.MEYCIQCtHnjT0wnj8hpxjHEFsjgZipBLMbJtn37Z1zNTXFabXwIhAKHG-63FgHjHIf1H_JCOSJV2xzOQF5pBV6lw9U1YGtXO';

console.log('Testing license verification...');

// Base64url decode function
function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// PEM to DER conversion
function pemToSpkiDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Import ECDSA key
async function importEcdsaP256Spki(spkiDer) {
  return crypto.subtle.importKey(
    "spki",
    spkiDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

// Verify signature
async function verifyEcdsaP256(spkiDer, messageBytes, sigBytes) {
  try {
    console.log('Importing key...');
    const key = await importEcdsaP256Spki(spkiDer);
    console.log('Key imported, verifying signature...');
    const result = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sigBytes,
      messageBytes
    );
    console.log('Verification result:', result);
    return result;
  } catch (error) {
    console.log('Verification error:', error.message);
    return false;
  }
}

// Test the license
async function testLicense() {
  const parts = licenseKey.split('.');
  if (parts.length !== 3) {
    console.log('❌ Invalid license format');
    return;
  }

  const [prefix, payloadB64, sigB64] = parts;
  console.log('Prefix:', prefix);

  try {
    const payloadJson = new TextDecoder().decode(base64urlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson);
    console.log('Payload:', payload);

    let sigBytes = base64urlToBytes(sigB64);
    const message = `SB1.${payloadB64}`;
    const messageBytes = new TextEncoder().encode(message);

    console.log('Message to verify:', message);
    console.log('DER signature length:', sigBytes.length);

    // Convert DER signature to raw R+S format for WebCrypto
    if (sigBytes[0] === 0x30 && sigBytes.length >= 70) { // DER sequence
      try {
        let pos = 2; // Skip sequence tag and length

        // Parse R
        if (sigBytes[pos] === 0x02) { // R integer tag
          pos++; // Skip tag
          const rLen = sigBytes[pos];
          pos++; // Skip length
          const rBytes = sigBytes.slice(pos, pos + rLen);
          pos += rLen;

          // Parse S
          if (sigBytes[pos] === 0x02) { // S integer tag
            pos++; // Skip tag
            const sLen = sigBytes[pos];
            pos++; // Skip length
            const sBytes = sigBytes.slice(pos, pos + sLen);

            // Concatenate R + S (each padded to 32 bytes for P-256)
            const rawSig = new Uint8Array(64);
            // Remove leading zero if present and right-align
            const rClean = rBytes[0] === 0 ? rBytes.slice(1) : rBytes;
            const sClean = sBytes[0] === 0 ? sBytes.slice(1) : sBytes;
            rawSig.set(rClean, 32 - rClean.length);
            rawSig.set(sClean, 64 - sClean.length);
            sigBytes = rawSig;

            console.log('Converted DER to raw signature length:', sigBytes.length);
          }
        }
      } catch (error) {
        console.log('DER parsing error:', error.message);
      }
    }

    // Test with the embedded public key
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnMfx2DOWIiemCeJ83Or3PSQuHqfH
7URIfkw/5y6V8lCURDILrF5nNkf2+3vdEfEq9aO6rkw5EeLrb/5ZiVuSaw==
-----END PUBLIC KEY-----`;

    const publicKeyDer = pemToSpkiDer(publicKeyPem);
    const isValid = await verifyEcdsaP256(publicKeyDer, messageBytes, sigBytes);

    console.log('Signature valid:', isValid);

    if (isValid) {
      console.log('✅ License verification PASSED!');
      console.log('License ID:', payload.licenseId);
      console.log('Email:', payload.email);
    } else {
      console.log('❌ License verification FAILED!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLicense();