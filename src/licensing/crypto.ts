// src/licensing/crypto.ts
// WebCrypto helpers for offline license verification (ECDSA P-256 / SHA-256)

declare const Buffer: any;

function ensureCrypto(): Crypto {
  const c = (globalThis as any).crypto as Crypto | undefined;
  if (!c?.subtle) throw new Error("WebCrypto unavailable: crypto.subtle missing");
  return c;
}

const atobSafe =
  globalThis.atob ??
  ((b64: string) => Buffer.from(b64, "base64").toString("binary"));

const btoaSafe =
  globalThis.btoa ??
  ((bin: string) => Buffer.from(bin, "binary").toString("base64"));

export function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  const bin = atobSafe(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoaSafe(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function pemToSpkiDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atobSafe(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

export async function importEcdsaP256Spki(spkiDer: Uint8Array): Promise<CryptoKey> {
  const cacheKey = bytesToBase64url(spkiDer);
  const hit = keyCache.get(cacheKey);
  if (hit) return hit;

  const p = (async () => {
    const crypto = ensureCrypto();
    return crypto.subtle.importKey(
      "spki",
      spkiDer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  })();

  keyCache.set(cacheKey, p);
  return p;
}

export async function verifyEcdsaP256(
  spkiDer: Uint8Array,
  messageBytes: Uint8Array,
  sigBytes: Uint8Array
): Promise<boolean> {
  try {
    const crypto = ensureCrypto();
    const key = await importEcdsaP256Spki(spkiDer);

    // Convert DER signature to raw R+S format if needed
    let finalSigBytes = sigBytes;
    if (sigBytes.length > 64 && sigBytes[0] === 0x30) {
      // Looks like DER format, convert to raw R+S
      try {
        let pos = 2; // Skip sequence tag and length

        // Parse R
        if (pos < sigBytes.length && sigBytes[pos] === 0x02) { // R integer tag
          pos++; // Skip tag
          if (pos < sigBytes.length) {
            const rLen = sigBytes[pos]!;
            pos++; // Skip length
            if (pos + rLen <= sigBytes.length) {
              const rBytes = sigBytes.slice(pos, pos + rLen);
              pos += rLen;

              // Parse S
              if (pos < sigBytes.length && sigBytes[pos] === 0x02) { // S integer tag
                pos++; // Skip tag
                if (pos < sigBytes.length) {
                  const sLen = sigBytes[pos]!;
                  pos++; // Skip length
                  if (pos + sLen <= sigBytes.length) {
                    const sBytes = sigBytes.slice(pos, pos + sLen);

                    // Concatenate R + S (each padded to 32 bytes for P-256)
                    const rawSig = new Uint8Array(64);
                    // Remove leading zero if present and right-align
                    const rClean = rBytes[0] === 0 ? rBytes.slice(1) : rBytes;
                    const sClean = sBytes[0] === 0 ? sBytes.slice(1) : sBytes;
                    rawSig.set(rClean, 32 - rClean.length);
                    rawSig.set(sClean, 64 - sClean.length);
                    finalSigBytes = rawSig;
                  }
                }
              }
            }
          }
        }
      } catch {
        // If DER parsing fails, use original bytes
      }
    }

    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      finalSigBytes,
      messageBytes
    );
  } catch {
    return false;
  }
}
