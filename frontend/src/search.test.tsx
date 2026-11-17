import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { bin, cable, renderRoutes, site, stubPaths } from "@/lib/testing/routeTesting";
import { routes } from "./routes";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("/search lists items with their paths and locations, with the matched text marked", async () => {
  stubPaths({
    "/api/search": {
      results: [
        { kind: "item", item: cable, marks: [{ start: 0, end: 4 }] },
        { kind: "location", location: { ...bin, label_code: "B-014", item_count: 1 }, marks: [] },
      ],
      next_cursor: null,
      count: 2,
    },
  });
  renderRoutes(routes, "/search?q=hdmi");
  expect(await screen.findByRole("heading", { level: 1, name: '"hdmi"' })).toBeVisible();
  const item = await screen.findByRole("link", { name: "HDMI cable" });
  expect(item.closest("li")).toHaveTextContent("HDMI cableHomeCables");
  expect(within(item).getByRole("mark")).toHaveTextContent(/^HDMI$/);
  expect(screen.getByRole("link", { name: "Cables" })).toHaveAttribute("href", "/locations/cables");
  expect(screen.getByText("2 results")).toBeVisible();
});

test("/search with nothing found offers to add it, with the name in the add sheet", async () => {
  stubPaths({
    "/api/search": { results: [], next_cursor: null, count: 0 },
    "/api/locations": { locations: [site, bin] },
  });
  renderRoutes(routes, "/search?q=multimeter");
  expect(await screen.findByText('Nothing matches "multimeter"')).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: 'Add "multimeter"' }));
  expect(await screen.findByRole("textbox", { name: "Add an item" })).toHaveValue("multimeter");
  expect(screen.getByRole("button", { name: /^Add to Inbox/ })).toBeInTheDocument();
});

test("/search with no query yet is titled Search and lists nothing", async () => {
  stubPaths({});
  renderRoutes(routes, "/search?q=");
  expect(await screen.findByRole("heading", { level: 1, name: "Search" })).toBeVisible();
  expect(screen.queryByText(/Nothing matches/)).toBeNull();
});

test("changing a found item's quantity shows at once", async () => {
  stubPaths({
    "/api/search": {
      results: [{ kind: "item", item: cable, marks: [] }],
      next_cursor: null,
      count: 1,
    },
  });
  renderRoutes(routes, "/search?q=hdmi");
  await userEvent.click(await screen.findByRole("button", { name: "One more" }));
  expect(screen.getByRole("button", { name: "Quantity 4, type a number" })).toBeVisible();
});
