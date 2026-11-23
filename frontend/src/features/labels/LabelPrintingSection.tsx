import { EditableText } from "@/components/EditableText";
import { ListSection } from "@/components/ListSection";
import { ValueRow } from "@/components/ValueRow";
import { usePrintAddress, useSetPrintAddress } from "./useLabelPrinting";

/** The Settings section naming the label printer Direct Print sends each label's PNG to. */
export function LabelPrintingSection() {
  const printAddress = usePrintAddress();
  const save = useSetPrintAddress();
  if (!printAddress.isSuccess) return null;
  return (
    <ListSection title="Label printer">
      <ValueRow name="Print address">
        <EditableText
          value={printAddress.data.print_address ?? ""}
          label="Print address"
          invitation="Add, to print labels from the app"
          type="url"
          onSave={save}
        />
      </ValueRow>
    </ListSection>
  );
}
