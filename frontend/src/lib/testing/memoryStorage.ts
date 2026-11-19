// Node's own localStorage, absent without a file, hides jsdom's, so the tests bring one.
export function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const stored = new Map<string, string>();
  return {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => void stored.set(key, value),
  };
}
