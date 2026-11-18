/** A price as it is typed, "24.99", from whole cents; empty when there is none. */
export function priceText(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

/** Whole cents from a typed price such as "24.99", "$24" or "1,299.5"; undefined if it isn't one. */
export function centsFrom(typed: string): number | undefined {
  const plain = typed.replace(/[,\s$€£¥]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return undefined;
  const [whole = "0", fraction = ""] = plain.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** A date such as 2027-03-01 as it reads on the page, "1 Mar 2027" in the owner's own style. */
export function dateText(isoDate: string | null): string | undefined {
  if (!isoDate) return undefined;
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  // Built from its parts in local time, so the day never shifts with the time zone.
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "medium" });
}
