const gate = "/login";

/** The Gate's address, carrying the address that was asked for so sign-in can return to it. */
export function gateAddress(asked: string): string {
  return asked === "/" ? gate : `${gate}?next=${encodeURIComponent(asked)}`;
}

/** Where to go after signing in: the address asked for, if it is one of this app's own. */
export function returnAddress(next: string | null): string {
  // "//host" and "/\host" are read by browsers as another site.
  const isOwnPath = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return next && isOwnPath && !next.startsWith(gate) ? next : "/";
}
