import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { memoryStorage } from "@/lib/testing/memoryStorage";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { CategorySheet } from "./CategorySheet";
import { rememberCategory } from "./recentCategories";

beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));

afterEach(() => vi.unstubAllGlobals());

const items = [
  { name: "Tools", item_count: 9 },
  { name: "Cables", item_count: 5 },
  { name: "Camping", item_count: 2 },
];

test("a category picked before on this device is listed first", async () => {
  rememberCategory("Camping");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ items }), { status: 200 }))),
  );
  renderWithTheme(<CategorySheet opened current={null} onPick={vi.fn()} onClose={vi.fn()} />);
  const dialog = await screen.findByRole("dialog", { name: "Category" });
  await within(dialog).findByRole("button", { name: /Tools/ });
  const names = within(dialog)
    .getAllByRole("button", { name: /Tools|Cables|Camping/ })
    .map((each) => each.textContent);
  expect(names.map((name) => name?.replace(/\d+/, ""))).toEqual(["Camping", "Tools", "Cables"]);
});
