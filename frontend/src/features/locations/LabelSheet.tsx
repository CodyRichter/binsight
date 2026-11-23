import { Button, Loader } from "@mantine/core";
import { IconDownload, IconPrinter } from "@tabler/icons-react";
import { PrintedLabel } from "@/components/PrintedLabel";
import { Sheet } from "@/components/Sheet";
import { usePrintAddress, usePrintLabel } from "@/features/labels";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { useAccess } from "@/lib/api/useAccess";

interface LabelSheetProps {
  code: string;
  opened: boolean;
  onClose: () => void;
}

/** Direct Print: "Printing" with a spinner while the label is on its way. */
function DirectPrintButton({ print, printing }: { print: () => void; printing: boolean }) {
  return (
    <Button
      variant="primary"
      aria-busy={printing}
      onClick={print}
      leftSection={printing ? <Loader size={18} aria-hidden /> : <IconPrinter aria-hidden />}
    >
      {printing ? "Printing" : "Direct Print"}
    </Button>
  );
}

/** A location's label, shown large, to send to the label printer or download. */
export function LabelSheet({ code, opened, onClose }: LabelSheetProps) {
  const address = labelImageAddress(code);
  const printAddress = usePrintAddress(opened);
  // Held here, not in the button, so the toast's Print again still works once the sheet closes.
  const { print, printing } = usePrintLabel(code, onClose);
  const canPrint = useAccess().canEdit && Boolean(printAddress.data?.print_address);
  return (
    <Sheet opened={opened} title="Label" onClose={onClose}>
      <PrintedLabel code={code} imageUrl={address} large />
      {canPrint && <DirectPrintButton print={print} printing={printing} />}
      <Button
        component="a"
        href={address}
        download
        variant={canPrint ? undefined : "primary"}
        leftSection={<IconDownload aria-hidden />}
      >
        Download
      </Button>
    </Sheet>
  );
}
