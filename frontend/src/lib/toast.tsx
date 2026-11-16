import { notifications } from "@mantine/notifications";
import { Toast } from "@/components/Toast";

type ToastShape =
  { message: string; onUndo: () => void } | { message: string; onRetry: () => void };

/** Shows the one toast: an undo offer for six seconds, or a refusal with Retry that stays until dismissed. */
export function showToast(shape: ToastShape): void {
  const close = () => notifications.hide(id);
  const refusal = "onRetry" in shape;
  const act = () => {
    close();
    if ("onRetry" in shape) shape.onRetry();
    else shape.onUndo();
  };
  // A refusal never closes by itself, so it is cleared here rather than queuing the next toast behind it.
  notifications.clean();
  const id = notifications.show({
    message: shape.message,
    role: refusal ? "alert" : "status",
    autoClose: refusal ? false : 6000,
    renderNotification: () => (
      <Toast
        message={shape.message}
        actionLabel={refusal ? "Retry" : "Undo"}
        onAction={act}
        onDismiss={refusal ? close : undefined}
      />
    ),
  });
}
