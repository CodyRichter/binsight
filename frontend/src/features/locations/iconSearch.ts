export interface IconMatches {
  /** The best matches, at most `shownAtMost` of them. */
  names: string[];
  total: number;
}

export const shownAtMost = 60;

// How many of the words the name itself holds, or null when a word is in neither name nor tags.
function wordsInName(name: string, tags: string, words: string[]): number | null {
  let inName = 0;
  for (const word of words) {
    if (name.includes(word)) inName += 1;
    else if (!tags.includes(word)) return null;
  }
  return inName;
}

/** The icons whose name or tags hold every typed word, in any order; names that match best first. */
export function searchIcons(index: [string, string][], query: string): IconMatches {
  const words = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
  const whole = words.join("-");
  const found: { name: string; inName: number }[] = [];
  for (const [name, tags] of index) {
    const inName = wordsInName(name, tags, words);
    if (inName !== null) found.push({ name, inName: name === whole ? Infinity : inName });
  }
  found.sort((a, b) => b.inName - a.inName || a.name.length - b.name.length);
  return { names: found.slice(0, shownAtMost).map((match) => match.name), total: found.length };
}
