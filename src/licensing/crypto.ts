// src/licensing/crypto.ts
// Ed25519 signature verification using Web Crypto API

// Type declarations for Node.js compatibility
declare const Buffer: {
  from: (data: string | Uint8Array, encoding?: string) => { toString: (encoding: string) => string };
} | undefined;

// Node.js compatibility helpers
const atob = globalThis.atob || ((str: string) => {
  // Node.js fallback using Buffer
  const buf = Buffer!.from(str, 'base64');
  return buf.toString('binary');
});
const btoa = globalThis.btoa || ((str: string) => {
  // Node.js fallback using Buffer
  const buf = Buffer!.from(str, 'binary');
  return buf.toString('base64');
});

/**
 * Decode base64url string to Uint8Array
 * Base64url uses URL-safe characters: A-Z, a-z, 0-9, -, _
 */
export function base64urlToUint8Array(base64url: string): Uint8Array {
  // Convert base64url to base64 by replacing chars and adding padding
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);

  // Decode base64 to binary string
  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode Uint8Array to base64url string
 */
export function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

/**
 * Verify an Ed25519 signature
 * @param publicKeyBytes Raw 32-byte Ed25519 public key
 * @param messageBytes Message that was signed
 * @param signatureBytes 64-byte signature
 * @returns Promise<boolean> true if signature is valid
 */
export async function verifyEd25519(
  publicKeyBytes: Uint8Array,
  messageBytes: Uint8Array,
  signatureBytes: Uint8Array
): Promise<boolean> {
  try {
    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      false,
      ['verify']
    );

    // Verify the signature
    return await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signatureBytes,
      messageBytes
    );
  } catch (error) {
    console.error('[SnippetBase] Ed25519 verification failed:', error);
    return false;
  }
}

/**
 * Compute SHA256 hash of input
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert to hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
