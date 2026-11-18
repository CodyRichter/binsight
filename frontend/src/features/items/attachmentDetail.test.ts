import { describe, expect, it } from "vitest";
import { attachmentDetail } from "./attachmentDetail";
import type { Attachment } from "./useItemAttachments";

const file: Attachment = {
  id: "receipt",
  kind: "file",
  filename: "Receipt.pdf",
  url: null,
  content_type: "application/pdf",
  size: 2048,
  file_url: "/api/attachments/receipt/file",
  created_at: "2026-11-16T12:00:00Z",
};

describe("attachmentDetail", () => {
  it("gives a file's size in KB or MB", () => {
    expect(attachmentDetail(file)).toBe("2 KB");
    expect(attachmentDetail({ ...file, size: 3 * 1024 * 1024 })).toBe("3.0 MB");
  });

  it("gives a named link's site, and nothing for a link shown by its address", () => {
    const link = { ...file, kind: "link" as const, url: "https://example.com/manual", size: null };
    expect(attachmentDetail({ ...link, filename: "Manual" })).toBe("example.com");
    expect(attachmentDetail({ ...link, filename: null })).toBeUndefined();
  });
});
