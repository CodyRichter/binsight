import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { TopBar } from "./TopBar";

function renderBar(query: string) {
  const onChange = vi.fn();
  const rendered = renderWithTheme(
    <TopBar wide={false} search={{ query, onChange }} onScan={vi.fn()} onAdd={vi.fn()} />,
  );
  return { ...rendered, onChange };
}

test("search reports every keystroke, without waiting for Enter", async () => {
  const { user, onChange } = renderBar("");
  await user.type(screen.getByRole("searchbox", { name: "Search" }), "usb");
  expect(onChange.mock.calls).toEqual([["u"], ["us"], ["usb"]]);
});

test("the field shows the current query", () => {
  renderBar("hdmi");
  expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("hdmi");
});

test("an empty field has nothing to clear", () => {
  renderBar("");
  expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
});

test("clearing empties the field and the query", async () => {
  const { user, onChange } = renderBar("hdmi");
  await user.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  expect(onChange).toHaveBeenCalledWith("");
});

test("navigating to a query does not steal focus without autoFocusSearch", () => {
  renderBar("hdmi");
  expect(screen.getByRole("searchbox", { name: "Search" })).not.toHaveFocus();
});

test("an externally cleared query updates the search field", () => {
  const { rerender } = renderWithTheme(
    <TopBar wide={false} search={{ query: "hdmi", onChange: vi.fn() }} />,
  );
  const box = screen.getByRole("searchbox", { name: "Search" });
  expect(box).toHaveValue("hdmi");
  rerender(<TopBar wide={false} search={{ query: "", onChange: vi.fn() }} />);
  expect(box).toHaveValue("");
});

test("tapping the search wrapper padding focuses the search input", async () => {
  const { user } = renderBar("");
  const box = screen.getByRole("searchbox", { name: "Search" });
  const wrapper = box.closest("[data-search]");
  if (!wrapper) throw new Error("Missing search wrapper");
  await user.click(wrapper);
  expect(box).toHaveFocus();
});
