import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { AddBar } from "./AddBar";

function renderBar() {
  const onAdd = vi.fn();
  const rendered = renderWithTheme(
    <AddBar onAdd={onAdd} onChangeDestination={vi.fn()} onAddByPhoto={vi.fn()} />,
  );
  return { ...rendered, onAdd };
}

test("Enter adds the name, clears the field and keeps focus", async () => {
  const { user, onAdd } = renderBar();
  const field = screen.getByRole("textbox", { name: "Add an item" });
  await user.type(field, "  Hex keys {Enter}");
  expect(onAdd).toHaveBeenCalledWith(["Hex keys"]);
  expect(field).toHaveValue("");
  expect(field).toHaveFocus();
});

test("a blank name is ignored", async () => {
  const { user, onAdd } = renderBar();
  await user.type(screen.getByRole("textbox", { name: "Add an item" }), "   {Enter}");
  expect(onAdd).not.toHaveBeenCalled();
});

test("several lines become several names", async () => {
  const { user, onAdd } = renderBar();
  await user.click(screen.getByRole("button", { name: "Add several" }));
  const lines = screen.getByRole("textbox", { name: "Add several, one name per line" });
  await user.type(lines, "A{Enter}B{Enter}{Enter} C ");
  await user.click(screen.getByRole("button", { name: "Add" }));
  expect(onAdd).toHaveBeenCalledWith(["A", "B", "C"]);
  expect(lines).toHaveValue("");
});

test("blank multi-line input is ignored", async () => {
  const { user, onAdd } = renderBar();
  await user.click(screen.getByRole("button", { name: "Add several" }));
  const lines = screen.getByRole("textbox", { name: "Add several, one name per line" });
  await user.type(lines, "   {Enter}  ");
  await user.click(screen.getByRole("button", { name: "Add" }));
  expect(onAdd).not.toHaveBeenCalled();
});

test("photo button draws 40px inside the bar while keeping its touch target", () => {
  renderBar();
  expect(screen.getByRole("button", { name: "Add by photo" })).toHaveStyle({ "--ai-size": "40px" });
});

test("Add sits to the right of Add several and submits a single item", async () => {
  const { user, onAdd } = renderBar();
  const addSeveral = screen.getByRole("button", { name: "Add several" });
  const add = screen.getByRole("button", { name: "Add" });
  expect(addSeveral.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const field = screen.getByRole("textbox", { name: "Add an item" });
  await user.type(field, "  Solder ");
  await user.click(add);
  expect(onAdd).toHaveBeenCalledWith(["Solder"]);
  expect(field).toHaveValue("");
  expect(field).toHaveFocus();
});

test("Add sits to the right of Add one while adding several", async () => {
  const { user } = renderBar();
  await user.click(screen.getByRole("button", { name: "Add several" }));
  const addOne = screen.getByRole("button", { name: "Add one" });
  const add = screen.getByRole("button", { name: "Add" });
  expect(addOne.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
