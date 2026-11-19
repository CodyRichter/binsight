import { Button } from "@mantine/core";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { PrintedLabel } from "@/components/PrintedLabel";
import { Sheet } from "@/components/Sheet";
import { labelImageAddress } from "@/lib/api/labelImageAddress";

interface LabelSheetProps {
  code: string;
  opened: boolean;
  onClose: () => void;
}

/** A location's label, shown large, to download or open in its own tab for the browser to print. */
export function LabelSheet({ code, opened, onClose }: LabelSheetProps) {
  const address = labelImageAddress(code);
  return (
    <Sheet opened={opened} title="Label" onClose={onClose}>
      <PrintedLabel code={code} imageUrl={address} large />
      <Button
        component="a"
        href={address}
        download
        variant="primary"
        leftSection={<IconDownload aria-hidden />}
      >
        Download
      </Button>
      <Button
        component="a"
        href={address}
        target="_blank"
        rel="noopener"
        leftSection={<IconExternalLink aria-hidden />}
      >
        Open to print
      </Button>
    </Sheet>
  );
}
