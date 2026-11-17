/** A count as the page states it: "1 item", "6 items". */
export function countWords(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
