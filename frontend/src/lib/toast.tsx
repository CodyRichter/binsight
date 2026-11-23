import { notifications } from "@mantine/notifications";
import { Toast } from "@/components/Toast";

type ToastShape =
  | { message: string; onUndo: () => void }
  | { message: string; onRetry: () => void }
  | { message: string; onPrintAgain: () => void };

function actionOf(shape: ToastShape): { label: "Undo" | "Retry" | "Print again"; run: () => void } {
  if ("onRetry" in shape) return { label: "Retry", run: shape.onRetry };
  if ("onPrintAgain" in shape) return { label: "Print again", run: shape.onPrintAgain };
  return { label: "Undo", run: shape.onUndo };
}

/**
 * Shows the one toast: an offer (Undo, Print again) for six seconds, or a refusal with Retry that
 * stays until dismissed.
 */
export function showToast(shape: ToastShape): void {
  const close = () => notifications.hide(id);
  const refusal = "onRetry" in shape;
  const action = actionOf(shape);
  const act = () => {
    close();
    action.run();
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
        actionLabel={action.label}
        onAction={act}
        onDismiss={refusal ? close : undefined}
      />
    ),
  });
}
