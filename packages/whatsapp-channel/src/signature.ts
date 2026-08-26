import { timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";

/**
 * Verify Meta's `X-Hub-Signature-256` over the raw request body.
 * Source: Meta WhatsApp Cloud API webhook docs.
 */
export function verifyWhatsappSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (appSecret.length === 0) return false;
  if (signatureHeader === undefined || signatureHeader.length === 0) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function bearerToken(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1];
  return token;
}

export function mcpAuthorized(
  header: string | undefined,
  expectedToken: string,
): boolean {
  if (expectedToken.length === 0) return false;
  const got = bearerToken(header);
  if (got === undefined) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expectedToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
