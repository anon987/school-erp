/**
 * Decodes the `school_id`/`roles` claims custom_access_token_hook (packages/db) stamps onto a
 * staff access token -- the mobile equivalent of apps/web/src/lib/core/auth/session.ts's
 * decodeAccessTokenClaims. React Native has no `Buffer` global and no guaranteed `atob`, so this
 * is a small dependency-free base64url decoder rather than reaching for the `buffer` package for
 * one function. Same rule as the web version: never trust this alone for authorization -- it's
 * read only after `supabase.auth.getUser()` has already verified the token is genuine; RLS is the
 * real backstop regardless.
 */
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of padded) {
    if (char === "=") break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  // UTF-8 decode the byte array (JWT payloads are UTF-8 JSON).
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    if (b0 < 0x80) {
      result += String.fromCharCode(b0);
      i += 1;
    } else if (b0 >= 0xc0 && b0 < 0xe0) {
      const b1 = bytes[i + 1] ?? 0;
      result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      i += 2;
    } else {
      const b1 = bytes[i + 1] ?? 0;
      const b2 = bytes[i + 2] ?? 0;
      result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
      i += 3;
    }
  }
  return result;
}

export function decodeAccessTokenClaims(accessToken: string): { schoolId: string | null; roles: string[] } {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) return { schoolId: null, roles: [] };

  try {
    const json = base64UrlDecode(payloadSegment);
    const payload = JSON.parse(json) as { school_id?: string; roles?: string[] };
    return { schoolId: payload.school_id ?? null, roles: payload.roles ?? [] };
  } catch {
    return { schoolId: null, roles: [] };
  }
}
