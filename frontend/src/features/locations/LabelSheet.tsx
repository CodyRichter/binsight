import { Button } from "@mantine/core";
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

/** A location's label, shown large, to send to the label printer or download. */
export function LabelSheet({ code, opened, onClose }: LabelSheetProps) {
  const address = labelImageAddress(code);
  const printAddress = usePrintAddress(opened);
  const { print, printing } = usePrintLabel(code);
  const canPrint = useAccess().canEdit && Boolean(printAddress.data?.print_address);
  return (
    <Sheet opened={opened} title="Label" onClose={onClose}>
      <PrintedLabel code={code} imageUrl={address} large />
      {canPrint && (
        <Button
          variant="primary"
          loading={printing}
          onClick={print}
          leftSection={<IconPrinter aria-hidden />}
        >
          Direct Print
        </Button>
      )}
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
