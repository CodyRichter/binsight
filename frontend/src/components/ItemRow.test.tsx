import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ItemRow } from "./ItemRow";

function renderRow(props: Partial<ComponentProps<typeof ItemRow>> = {}) {
  return renderWithTheme(
    <ul>
      <ItemRow name="AA batteries" to="/items/1" {...props} />
    </ul>,
  );
}

test("the parts of the name a search matched are marked", () => {
  renderRow({ marks: [{ start: 3, end: 6 }] });
  expect(screen.getByRole("mark")).toHaveTextContent(/^bat$/);
});

test("a name without marks is not marked", () => {
  renderRow();
  expect(screen.queryByRole("mark")).not.toBeInTheDocument();
});

test("the quantity shows only above one", () => {
  const { rerender } = renderRow({ quantity: 1, onQuantityChange: vi.fn() });
  expect(screen.queryByRole("button", { name: "One more" })).not.toBeInTheDocument();
  rerender(
    <ul>
      <ItemRow name="AA batteries" to="/items/1" quantity={3} onQuantityChange={vi.fn()} />
    </ul>,
  );
  expect(screen.getByRole("button", { name: "Quantity 3, type a number" })).toBeInTheDocument();
});

test("the quantity needs a way to change it", () => {
  renderRow({ quantity: 3 });
  expect(screen.queryByRole("button", { name: "One more" })).not.toBeInTheDocument();
});

test("an item in place shows no status", () => {
  renderRow();
  expect(screen.getByRole("listitem")).toHaveTextContent(/^AA batteries$/);
});

test("a missing item says so", () => {
  renderRow({ status: "missing" });
  expect(screen.getByText("Missing")).toBeInTheDocument();
});

test("a lent out item without a name reads Lent out", () => {
  renderRow({ status: "lent_out" });
  expect(screen.getByText("Lent out")).toBeInTheDocument();
});

test("in check mode a tap on the name ticks the box", async () => {
  const onChange = vi.fn();
  const { user } = renderRow({ check: { checked: false, onChange } });
  await user.click(screen.getByText("AA batteries"));
  expect(onChange).toHaveBeenCalledWith(true);
  expect(screen.getByRole("checkbox", { name: "AA batteries" })).toBeInTheDocument();
});

test("Move on the row moves that item in one tap", async () => {
  const onMove = vi.fn();
  const { user } = renderRow({ onMove });
  await user.click(screen.getByRole("button", { name: "Move AA batteries" }));
  expect(onMove).toHaveBeenCalledOnce();
});
