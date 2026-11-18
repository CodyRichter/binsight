const units = ["bytes", "KB", "MB", "GB", "TB"];

/** A backup's size as people read it: "820 KB", "12.4 MB". */
export function sizeText(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1000 && unit < units.length - 1) {
    size /= 1000;
    unit += 1;
  }
  const shown = unit === 0 || size >= 100 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${shown} ${units[unit]}`;
}

/** When a backup was taken, in the owner's own date and time format. */
export function takenText(takenAt: string): string {
  return new Date(takenAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
