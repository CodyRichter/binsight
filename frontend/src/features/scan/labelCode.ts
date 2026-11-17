const labelPath = /^\/l\/([^/]+)\/?$/;

/** The code in a label's QR address, such as B-014 from ".../l/B-014"; null for anything else. */
export function labelCode(text: string): string | null {
  // Any host: a label printed while the app had another address still names its location.
  if (!URL.canParse(text)) return null;
  const found = labelPath.exec(new URL(text).pathname);
  return found ? decodeURIComponent(found[1]) : null;
}
