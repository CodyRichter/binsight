import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ItemRow } from "./ItemRow";

function renderRow(props: Partial<Omit<ComponentProps<typeof ItemRow>, "to" | "onPick">> = {}) {
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

test("a row shows its home's checked stamp only once it is stale", () => {
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  const { unmount } = renderRow({ lastChecked: new Date() });
  expect(screen.queryByText(/checked/i)).not.toBeInTheDocument();
  unmount();
  renderRow({ lastChecked: twoYearsAgo });
  expect(screen.getByText("Checked 2 years ago")).toBeInTheDocument();
});

test("a row whose home was never checked says so", () => {
  renderRow({ lastChecked: null });
  expect(screen.getByText("Never checked")).toBeInTheDocument();
});

test("a row in a sheet picks its item instead of opening it", () => {
  const onPick = vi.fn();
  renderWithTheme(
    <ul>
      <ItemRow name="Drill" onPick={onPick} />
    </ul>,
  );
  screen.getByRole("button", { name: "Drill" }).click();
  expect(onPick).toHaveBeenCalled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("a linked item's row removes the link, named for the item", () => {
  const onRemoveLink = vi.fn();
  renderRow({ onRemoveLink });
  screen.getByRole("button", { name: "Remove link to AA batteries" }).click();
  expect(onRemoveLink).toHaveBeenCalled();
});

test("a selectable row keeps its link, and its box selects it", async () => {
  const onChange = vi.fn();
  renderRow({ select: { selected: false, onChange } });
  expect(screen.getByRole("link", { name: "AA batteries" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("checkbox", { name: "Select AA batteries" }));
  expect(onChange).toHaveBeenCalledWith(true);
});

test("a selected row is highlighted", () => {
  renderRow({ select: { selected: true, onChange: vi.fn() } });
  expect(screen.getByRole("checkbox", { name: "Select AA batteries" })).toBeChecked();
  expect(screen.getByRole("listitem")).toHaveAttribute("data-selected", "true");
});
