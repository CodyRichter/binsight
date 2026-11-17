const day = 24 * 60 * 60 * 1000;

export function timeAgo(when: Date): string {
  const days = Math.floor((Date.now() - when.getTime()) / day);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 7) return format.format(-days, "day");
  if (days < 30) return format.format(-Math.floor(days / 7), "week");
  if (days < 730) return format.format(-Math.floor(days / 30), "month");
  return format.format(-Math.floor(days / 365), "year");
}
