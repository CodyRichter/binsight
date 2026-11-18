import type { Attachment } from "./useItemAttachments";

const KB = 1024;
const MB = KB * KB;

function sizeWords(size: number): string {
  if (size >= MB) return `${(size / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / KB))} KB`;
}

/** The muted line under an attachment's name: a file's size, or a named link's site. */
export function attachmentDetail(attachment: Attachment): string | undefined {
  if (attachment.kind === "file" && attachment.size !== null) return sizeWords(attachment.size);
  if (attachment.kind === "link" && attachment.url && attachment.filename) {
    return new URL(attachment.url).host;
  }
  return undefined;
}
