import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { IconGrid } from "./IconGrid";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json([]))),
  );
});

test("each icon is a button named by its words, and the chosen one is pressed", async () => {
  const onPick = vi.fn();
  renderWithTheme(
    <IconGrid type="bin" icons={[null, "tools-kitchen-2"]} chosen={null} onPick={onPick} />,
  );
  expect(screen.getByRole("button", { name: "Type's icon" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const kitchen = screen.getByRole("button", { name: "Tools kitchen 2" });
  expect(kitchen).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(kitchen);
  expect(onPick).toHaveBeenCalledWith("tools-kitchen-2");
});

test("says how many more matched than are shown", () => {
  renderWithTheme(
    <IconGrid type="bin" icons={["box"]} chosen={null} total={212} onPick={vi.fn()} />,
  );
  expect(screen.getByText("1 of 212 shown. Keep typing to narrow.")).toBeInTheDocument();
});
