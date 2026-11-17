import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ConfirmDialog } from "./ConfirmDialog";

test("renders safe button before danger button and invokes both handlers", async () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const { user } = renderWithTheme(
    <ConfirmDialog
      opened
      title="Delete 12 blank labels?"
      detail="Their codes can never be used again."
      cancelLabel="Keep them"
      confirmLabel="Delete forever"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );

  const keep = screen.getByRole("button", { name: "Keep them" });
  const confirm = screen.getByRole("button", { name: "Delete forever" });
  expect(keep.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await user.click(keep);
  expect(onCancel).toHaveBeenCalledOnce();

  await user.click(confirm);
  expect(onConfirm).toHaveBeenCalledOnce();
});
