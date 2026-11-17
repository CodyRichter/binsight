/** Where a label's printable PNG downloads from. */
export function labelImageAddress(code: string): string {
  return `/api/labels/${encodeURIComponent(code)}/image`;
}
