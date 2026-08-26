/** Digits-only form used for allowlists and Graph API `to` fields. */
export function normalizePhone(value: string): string {
  return value.replace(/\D+/g, "");
}

export function phonesEqual(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function isAllowedSender(
  from: string,
  allowedSenders: readonly string[],
  allowAllSenders: boolean,
): boolean {
  if (allowAllSenders) return true;
  const incoming = normalizePhone(from);
  if (incoming.length === 0) return false;
  return allowedSenders.some((allowed) => phonesEqual(allowed, incoming));
}

/** Last four digits only. Never log a full WhatsApp number. */
export function phoneTail(from: string): string {
  const digits = normalizePhone(from);
  return digits.length <= 4 ? digits : digits.slice(-4);
}

export function waMeLink(displayNumber: string): string | undefined {
  const digits = normalizePhone(displayNumber);
  if (digits.length === 0) return undefined;
  return `https://wa.me/${digits}`;
}
