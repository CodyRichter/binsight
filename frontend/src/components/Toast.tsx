import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import classes from "./Toast.module.css";

interface ToastProps {
  message: string;
  actionLabel: "Undo" | "Retry" | "Print again";
  onAction: () => void;
  onDismiss?: () => void;
}

export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  return (
    <div className={classes.toast}>
      {onDismiss && <IconAlertTriangle aria-hidden className={classes.icon} />}
      <p className={classes.message}>{message}</p>
      <button type="button" className={classes.action} onClick={onAction}>
        {actionLabel}
      </button>
      {onDismiss && (
        <button type="button" className={classes.close} aria-label="Close" onClick={onDismiss}>
          <IconX aria-hidden size={20} />
        </button>
      )}
    </div>
  );
}
