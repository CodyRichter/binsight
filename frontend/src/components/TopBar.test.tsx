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
