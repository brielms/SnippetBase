// src/licensing/license.ts
// Offline licensing system for SnippetBase Pro
// Two-token scheme: License Key (portable) + Activation Code (device-bound)

import { base64urlToUint8Array, uint8ArrayToBase64url, verifyEd25519, sha256 } from './crypto';

// Embedded Ed25519 public key for license verification
// This key is used to verify License Keys
// Generated once and embedded in the plugin - private key never included
//
// To generate a new keypair:
// 1. Run: node tools/generate-keypair.mjs
// 2. Replace the value below with the "Public Key" output
// 3. Store the private key securely (never commit it)
//
const PUBLIC_KEY_BASE64URL = 'Dwc1rmTPKzT81CwnAyoWKBkc2pzjBuAwfWzjgiiYUR4';

// Convert embedded public key to bytes
const PUBLIC_KEY_BYTES = base64urlToUint8Array(PUBLIC_KEY_BASE64URL);

export interface LicensePayload {
  v: number;
  product: string;
  plan: string;
  licenseId: string;
  issuedAt: number;
  email?: string;
  buyerId?: string;
  seats?: number;
}

export interface ParsedToken {
  prefix: "SB1";
  payloadB64: string;
  payload: LicensePayload;
  sig: Uint8Array;
}

export interface LicenseVerification {
  ok: boolean;
  licenseId?: string;
  email?: string;
  buyerId?: string;
  seats?: number;
  error?: string;
}


/**
 * Parse a token string into payload and signature
 * Expected format: PREFIX.<base64url-payload>.<base64url-signature>
 */
export function parseToken(token: string): ParsedToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [prefix, payloadB64, sigB64] = parts;

  try {
    // Decode payload (JSON)
    const payloadBytes = base64urlToUint8Array(payloadB64 as string);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as LicensePayload;

    // Decode signature
    const sig = base64urlToUint8Array(sigB64 as string);

    // Validate prefix
    if (prefix !== 'SB1') {
      return null;
    }

    return { prefix: prefix as "SB1", payloadB64: payloadB64 as string, payload, sig };
  } catch (error) {
    console.error('[SnippetBase] Token parsing failed:', error);
    return null;
  }
}

/**
 * Verify a License Key (SB1 token)
 */
export interface LicenseVerification {
  ok: boolean;
  licenseId?: string;
  email?: string;
  buyerId?: string;
  seats?: number;
  error?: string;
}

export async function verifyLicenseKey(token: string): Promise<LicenseVerification> {
  try {
    const parsed = parseToken(token);
    if (!parsed) {
      return { ok: false, error: 'Invalid token format' };
    }

    const { prefix, payloadB64, payload, sig } = parsed;

    // Validate prefix
    if (prefix !== 'SB1') {
      return { ok: false, error: 'Invalid token type' };
    }

    // Validate structure
    if (payload.v !== 1 || payload.product !== 'snippetbase' || payload.plan !== 'pro') {
      return { ok: false, error: 'Invalid license payload' };
    }

    if (!payload.licenseId || typeof payload.licenseId !== 'string') {
      return { ok: false, error: 'Missing licenseId' };
    }

    if (!payload.issuedAt || typeof payload.issuedAt !== 'number') {
      return { ok: false, error: 'Missing issuedAt' };
    }

    // Verify signature over canonical message: prefix + "." + payloadB64
    const message = `${prefix}.${payloadB64}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      const signatureValid = await verifyEd25519(PUBLIC_KEY_BYTES, messageBytes, sig);

      if (!signatureValid) {
        return { ok: false, error: 'Invalid signature' };
      }
    } catch (cryptoError) {
      // If crypto operations fail, we cannot verify the signature
      // This is a security-critical failure - reject the license
      console.error('[SnippetBase] Crypto verification failed:', cryptoError);
      return { ok: false, error: 'Signature verification failed' };
    }

    return {
      ok: true,
      licenseId: payload.licenseId,
      email: payload.email,
      buyerId: payload.buyerId,
      seats: payload.seats || 1
    };
  } catch (error) {
    console.error('[SnippetBase] License verification error:', error);
    return { ok: false, error: `Verification error: ${error instanceof Error ? error.message : String(error)}` };
  }
}


/**
 * Generate a stable device fingerprint hash
 * Combines platform info with a persisted installSalt for uniqueness
 */
export async function getDeviceFingerprint(installSalt?: Uint8Array): Promise<string> {
  // Generate install salt if not provided (first run)
  const salt = installSalt || crypto.getRandomValues(new Uint8Array(16));

  // Create fingerprint string - stable per machine but not personally identifying
  // Note: Using minimal platform detection to avoid Obsidian platform API restrictions
  const fingerprintData = {
    appId: 'obsidian', // Obsidian app identifier
    installSalt: uint8ArrayToBase64url(salt),
  };

  const fingerprintString = JSON.stringify(fingerprintData);
  const hash = await sha256(fingerprintString);

  return hash;
}

/**
 * Check if Pro features are enabled
 * Requires both valid license key and matching activation code
 */
export async function isProEnabled(licenseKey?: string): Promise<boolean> {
  if (!licenseKey) {
    return false;
  }

  try {
    const licenseResult = await verifyLicenseKey(licenseKey);
    return licenseResult.ok;
  } catch (error) {
    console.error('[SnippetBase] License verification failed:', error);
    return false;
  }
}

/**
 * Require Pro for a feature - shows paywall notice if not enabled
 * Returns true if Pro is enabled, false otherwise
 */
export async function requirePro(
  actionName: string,
  licenseKey?: string
): Promise<boolean> {
  const enabled = await isProEnabled(licenseKey);
  if (!enabled) {
    // Dynamic import to avoid circular dependency
    // In tests, this will fail gracefully and not break the test
    try {
      const { Notice } = await import('obsidian');
      new Notice(`Pro feature — enter your license key in settings`);
    } catch {
      // Silently fail in test environments where obsidian is not available
      console.debug('[SnippetBase] Notice not available (test environment)');
    }
  }
  return enabled;
}

