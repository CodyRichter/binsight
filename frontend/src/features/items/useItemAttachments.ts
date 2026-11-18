import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { itemKey, refreshItemLists, type Item } from "./useItems";

type AttachmentPage = components["schemas"]["Page_Attachment_"];
export type Attachment = AttachmentPage["items"][number];
type Added = components["schemas"]["AttachmentAdded"];
type Removed = components["schemas"]["AttachmentRemoved"];
type NewWebLink = components["schemas"]["NewWebLink"];

function attachmentsKey(itemId: string) {
  return ["item-attachments", itemId] as const;
}

/** An item's photos, files and web links, photos first. */
export function useItemAttachments(itemId: string, enabled: boolean) {
  return useQuery({
    queryKey: attachmentsKey(itemId),
    // An item has a handful of attachments, so the first page is all of them.
    queryFn: ({ signal }) =>
      api.get<AttachmentPage>(`/api/items/${itemId}/attachments?limit=200`, signal),
    enabled,
  });
}

/** What an attachment is called: its name, a link's address, or "Photo". */
export function attachmentName(attachment: Attachment): string {
  return attachment.filename ?? attachment.url ?? "Photo";
}

function useRefresh(item: Item) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: attachmentsKey(item.id) }),
      queryClient.invalidateQueries({ queryKey: itemKey(item.id) }),
      queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) }),
      // The first photo is the item's picture in every list.
      refreshItemLists(queryClient),
    ]);
}

export type NewAttachment =
  | { kind: "photo"; photo: File }
  | { kind: "file"; file: File }
  | { kind: "link"; link: NewWebLink };

function upload(part: string, file: File): FormData {
  const form = new FormData();
  form.append(part, file);
  return form;
}

function send(item: Item, attachment: NewAttachment): Promise<Added> {
  if (attachment.kind === "photo")
    return api.post<Added>(`/api/items/${item.id}/photos`, upload("photo", attachment.photo));
  if (attachment.kind === "file")
    return api.post<Added>(`/api/items/${item.id}/files`, upload("file", attachment.file));
  return api.post<Added>(`/api/items/${item.id}/web-links`, attachment.link);
}

function told(item: Item, added: Added): string {
  if (added.kind === "photo") return `Added a photo to ${itemName(item.name)}`;
  if (added.kind === "file") return `Attached ${attachmentName(added)}`;
  return `Attached link to ${itemName(item.name)}`;
}

/** Adds a photo, file or web link to an item, saying so with Undo; a refusal offers Retry. */
export function useAttach(item: Item): (attachment: NewAttachment) => void {
  const undo = useUndo();
  const refresh = useRefresh(item);
  const { mutate } = useMutation({
    mutationFn: (attachment: NewAttachment) => send(item, attachment),
    onSuccess: (added) =>
      showToast({ message: told(item, added), onUndo: () => undo(added.history_entry_id) }),
    onError: (error, attachment) =>
      showToast({ message: error.message, onRetry: () => mutate(attachment) }),
    onSettled: refresh,
  });
  return (attachment) => mutate(attachment);
}

/** Takes an attachment off an item, gone from the list at once, with Undo. */
export function useRemoveAttachment(item: Item): (attachment: Attachment) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const refresh = useRefresh(item);
  const key = attachmentsKey(item.id);
  const { mutate } = useMutation({
    mutationFn: (attachment: Attachment) =>
      api.delete<Removed>(`/api/items/${item.id}/attachments/${attachment.id}`),
    onMutate: (attachment) => {
      const before = queryClient.getQueryData<AttachmentPage>(key);
      queryClient.setQueryData<AttachmentPage>(
        key,
        (page) =>
          page && { ...page, items: page.items.filter((each) => each.id !== attachment.id) },
      );
      return before;
    },
    onSuccess: (removed) =>
      showToast({
        message: `Removed ${attachmentName(removed)}`,
        onUndo: () => undo(removed.history_entry_id),
      }),
    onError: (error, attachment, before) => {
      queryClient.setQueryData(key, before);
      showToast({ message: error.message, onRetry: () => mutate(attachment) });
    },
    onSettled: refresh,
  });
  return (attachment) => mutate(attachment);
}
