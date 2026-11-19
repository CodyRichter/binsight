const typedCode = /^([a-z0-9]{3})-?([a-z0-9]{3})$/i;

/** The location code typed text names, such as K7Q-4MZ from "k7q4mz"; null for anything else. */
export function locationCode(text: string): string | null {
  const found = typedCode.exec(text.trim());
  return found ? `${found[1]}-${found[2]}`.toUpperCase() : null;
}
