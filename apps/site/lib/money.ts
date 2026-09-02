/** Format integer cents as ZAR with thin spaces, never commas. */
export function formatZar(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const frac = cents % 100;
  const grouped = whole
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  if (frac === 0) return `R${grouped}`;
  return `R${grouped}.${frac.toString().padStart(2, "0")}`;
}

/** Variation gross from actual-cost components. Integer cents, 10% markup. */
export function variationGrossCents(
  labourCents: number,
  plantCents: number,
  materialCents: number,
): number {
  const net = labourCents + plantCents + materialCents;
  return Math.trunc((net * 11) / 10);
}

/** Parse rands typed on site into cents. Rejects non-integers. */
export function randsToCents(rands: number): number {
  if (!Number.isFinite(rands)) throw new TypeError("invalid amount");
  return Math.round(rands * 100);
}
