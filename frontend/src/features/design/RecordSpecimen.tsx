import { Button, Menu, TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditableText } from "@/components/EditableText";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Sheet } from "@/components/Sheet";
import { TagList } from "@/components/TagList";
import { ValueRow } from "@/components/ValueRow";
import { showToast } from "@/lib/toast";
import { DesignFrame } from "./DesignFrame";
import { locationUrl, pathTo, sampleItems } from "./sampleHome";

export function RecordSpecimen() {
  const { item: id } = useParams();
  const navigate = useNavigate();
  const item = sampleItems.find((sample) => sample.id === id) ?? sampleItems[0];
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState("Cables");
  const [lentTo, setLentTo] = useState(item.status === "lent_out" ? "Dana" : "");
  const [tags, setTags] = useState(["hdmi", "video"]);
  const [newTag, setNewTag] = useState("");
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setNewTag("");
    setTagSheetOpen(false);
  }

  return (
    <DesignFrame key={item.id} parent={locationUrl(item.home)}>
      <PageLead
        header={
          <PageHeader
            title={name}
            onRename={setName}
            parents={pathTo(item.home)}
            thumbnail={{ photoUrl: item.photoUrl }}
            status={
              lentTo
                ? { status: "lent_out", lentTo }
                : item.status === "in_place"
                  ? undefined
                  : { status: item.status }
            }
            actions={
              <>
                <Button>Move</Button>
                <Button>Mark missing</Button>
              </>
            }
            menu={
              <Menu.Item
                color="danger"
                leftSection={<IconTrash aria-hidden size={20} />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete item
              </Menu.Item>
            }
          />
        }
      >
        <QuantityStepper value={quantity} onChange={setQuantity} />
      </PageLead>
      <ListSection title="Details">
        <ValueRow name="Category">
          <EditableText value={category} label="Category" onSave={setCategory} />
        </ValueRow>
        <ValueRow name="Lent to">
          <EditableText value={lentTo} label="Lent to" invitation="Add person" onSave={setLentTo} />
        </ValueRow>
        <ValueRow name="Tags">
          <TagList
            tags={tags}
            tagHref={(tag) => `/design/list?q=${tag}`}
            onRemoveTag={(tag) => setTags(tags.filter((other) => other !== tag))}
            onAddTag={() => setTagSheetOpen(true)}
          />
        </ValueRow>
        <ValueRow name="Serial number">
          <EditableText
            value={serial}
            label="Serial number"
            invitation="Add a serial number"
            onSave={setSerial}
          />
        </ValueRow>
        <ValueRow name="Notes">
          <EditableText
            value={notes}
            label="Notes"
            invitation="Add notes"
            multiline
            onSave={setNotes}
          />
        </ValueRow>
      </ListSection>
      <Sheet
        opened={tagSheetOpen}
        title="Add tag"
        onClose={() => setTagSheetOpen(false)}
        onSubmit={addTag}
      >
        <TextInput
          label="Tag"
          data-autofocus
          value={newTag}
          onChange={(event) => setNewTag(event.currentTarget.value)}
        />
        <Button type="submit" variant="primary">
          Add tag
        </Button>
      </Sheet>
      <ConfirmDialog
        opened={deleteOpen}
        title={`Delete ${name}?`}
        detail="It stays in history and can be restored from Settings."
        cancelLabel="Keep item"
        confirmLabel="Delete item"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          showToast({ message: `Deleted ${name}`, onUndo: () => undefined });
          navigate(locationUrl(item.home));
        }}
      />
    </DesignFrame>
  );
}
