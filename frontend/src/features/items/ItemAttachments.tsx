import { Button } from "@mantine/core";
import { useState } from "react";
import { AttachmentRow } from "@/components/AttachmentRow";
import { ListSection } from "@/components/ListSection";
import { AttachSheet } from "./AttachSheet";
import { attachmentDetail } from "./attachmentDetail";
import {
  attachmentName,
  useAttach,
  useItemAttachments,
  useRemoveAttachment,
  type Attachment,
} from "./useItemAttachments";
import type { Item } from "./useItems";
import { WebLinkSheet } from "./WebLinkSheet";
import { useAccess } from "@/lib/api/useAccess";

function hrefOf(attachment: Attachment): string {
  return attachment.file_url ?? attachment.url ?? "";
}

interface ItemAttachmentsProps {
  item: Item;
  /** Whether the Attach sheet is open; More opens it too. */
  attaching: boolean;
  onAttaching: (attaching: boolean) => void;
}

/** An item's photos, files and web links, left out while it has none, and the Attach sheet. */
export function ItemAttachments({ item, attaching, onAttaching }: ItemAttachmentsProps) {
  const attachments = useItemAttachments(item.id, true).data?.items ?? [];
  const attach = useAttach(item);
  const remove = useRemoveAttachment(item);
  const [addingLink, setAddingLink] = useState(false);
  const { canEdit } = useAccess();
  return (
    <>
      {attachments.length > 0 && (
        <ListSection
          title="Attachments"
          count={attachments.length}
          action={
            canEdit && (
              <Button variant="subtle" onClick={() => onAttaching(true)}>
                Attach
              </Button>
            )
          }
        >
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              kind={attachment.kind}
              name={attachmentName(attachment)}
              detail={attachmentDetail(attachment)}
              href={hrefOf(attachment)}
              photoUrl={
                attachment.kind === "photo" ? (attachment.file_url ?? undefined) : undefined
              }
              pdf={attachment.content_type === "application/pdf"}
              onRemove={canEdit ? () => remove(attachment) : undefined}
            />
          ))}
        </ListSection>
      )}
      <AttachSheet
        opened={attaching}
        onAttach={attach}
        onAddLink={() => {
          onAttaching(false);
          setAddingLink(true);
        }}
        onClose={() => onAttaching(false)}
      />
      <WebLinkSheet
        opened={addingLink}
        onAttach={(link) => attach({ kind: "link", link })}
        onClose={() => setAddingLink(false)}
      />
    </>
  );
}
