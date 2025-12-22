// src/licensing/license.ts
import { base64urlToBytes, pemToSpkiDer, verifyEcdsaP256 } from "./crypto";

export interface LicensePayload {
  v: 1;
  product: "snippetbase";
  plan: "pro";
  licenseId: string;
  issuedAt: number;
  email?: string;
  buyerId?: string;
  // Optional for future; do not enforce right now:
  seats?: number;
}

export interface LicenseVerification {
  ok: boolean;
  error?: string;
  licenseId?: string;
  email?: string;
  buyerId?: string;
  seats?: number;
}

export interface ParsedLicenseToken {
  prefix: "SB1";
  payloadB64: string;
  payload: LicensePayload;
  sigBytes: Uint8Array;
}

const PUBLIC_KEYS_PEM: string[] = [
  // Fresh test keypair - replace with your real keys in production
  `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnMfx2DOWIiemCeJ83Or3PSQuHqfH
7URIfkw/5y6V8lCURDILrF5nNkf2+3vdEfEq9aO6rkw5EeLrb/5ZiVuSaw==
-----END PUBLIC KEY-----`,
];

const PUBLIC_KEYS_SPKI = PUBLIC_KEYS_PEM.map(pemToSpkiDer);

export function parseLicenseToken(token: string): ParsedLicenseToken | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const [prefix, payloadB64, sigB64] = parts;
  if (prefix !== "SB1") return null;

  try {
    const payloadJson = new TextDecoder().decode(base64urlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as LicensePayload;

    // Minimal structural checks
    if (payload.v !== 1) return null;
    if (payload.product !== "snippetbase") return null;
    if (payload.plan !== "pro") return null;
    if (typeof payload.licenseId !== "string" || !payload.licenseId) return null;
    if (typeof payload.issuedAt !== "number") return null;

    const sigBytes = base64urlToBytes(sigB64);
    return { prefix: "SB1", payloadB64, payload: payload as LicensePayload, sigBytes };
  } catch {
    return null;
  }
}

export async function verifyLicenseKey(token: string): Promise<LicenseVerification> {
  const parsed = parseLicenseToken(token);
  if (!parsed) return { ok: false, error: "Invalid license key format" };

  const msg = `SB1.${parsed.payloadB64}`;
  const msgBytes = new TextEncoder().encode(msg);

  for (const spki of PUBLIC_KEYS_SPKI) {
    const ok = await verifyEcdsaP256(spki, msgBytes, parsed.sigBytes);
    if (ok) {
      return {
        ok: true,
        licenseId: parsed.payload.licenseId,
        email: parsed.payload.email,
        buyerId: parsed.payload.buyerId,
        seats: parsed.payload.seats ?? 1,
      };
    }
  }

  return { ok: false, error: "Invalid signature" };
}

/**
 * Verify a License Key with a specific public key (for testing)
 * @param token License token to verify
 * @param publicKeyPem PEM-encoded public key to use for verification
 * @returns License verification result
 */
export async function verifyLicenseKeyWithPublicKey(token: string, publicKeyPem: string): Promise<LicenseVerification> {
  const publicKeySpki = pemToSpkiDer(publicKeyPem);
  const parsed = parseLicenseToken(token);
  if (!parsed) return { ok: false, error: "Invalid license key format" };

  const msg = `SB1.${parsed.payloadB64}`;
  const msgBytes = new TextEncoder().encode(msg);

  try {
    const ok = await verifyEcdsaP256(publicKeySpki, msgBytes, parsed.sigBytes);
    if (!ok) return { ok: false, error: "Invalid signature" };

    return {
      ok: true,
      licenseId: parsed.payload.licenseId,
      email: parsed.payload.email,
      buyerId: parsed.payload.buyerId,
      seats: parsed.payload.seats ?? 1,
    };
  } catch {
    return { ok: false, error: "Verification error" };
  }
}

export async function requirePro(actionName: string, licenseKey?: string): Promise<boolean> {
  if (!licenseKey) {
    await showPaywall();
    return false;
  }
  const res = await verifyLicenseKey(licenseKey);
  if (!res.ok) {
    await showPaywall(res.error);
    return false;
  }
  return true;
}

async function showPaywall(extra?: string) {
  try {
    const { Notice } = await import("obsidian");
    new Notice(`SnippetBase Pro required. ${extra ? "(" + extra + ") " : ""}Enter your key in Settings.`);
  } catch {
    // ignore in non-obsidian environments
  }
}

