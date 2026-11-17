import { Button, Group, Modal, Stack, Text } from "@mantine/core";

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  detail?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  opened,
  title,
  detail,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal opened={opened} title={title} onClose={onCancel}>
      <Stack gap="md">
        {detail && <Text size="md">{detail}</Text>}
        <Group justify="flex-end" gap="sm">
          <Button data-autofocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
