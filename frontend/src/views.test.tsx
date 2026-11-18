import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { cable, renderRoutes, stubPaths } from "@/lib/testing/routeTesting";
import { routes } from "./routes";

afterEach(() => {
  vi.unstubAllGlobals();
});

const lentOut = { view: "lent-out", title: "Lent out", count: 1 };
const archive = { view: "archive", title: "Archive", count: 0 };
const savedCables = {
  id: "saved-cables",
  name: "All cables",
  query: "",
  category: "Cables",
  pinned: true,
  count: 41,
};

test("/views lists every view with its count, then the saved searches", async () => {
  stubPaths({
    "/api/views": { items: [lentOut, archive], next_cursor: null },
    "/api/saved-searches": { items: [savedCables], next_cursor: null },
  });
  renderRoutes(routes, "/views");
  expect(await screen.findByRole("heading", { level: 1, name: "Views" })).toBeVisible();
  expect(
    (await screen.findAllByRole("link", { name: "Lent out" }))[0].closest("li"),
  ).toHaveTextContent("Lent out1");
  expect(screen.getByRole("heading", { level: 2, name: /Saved searches/ })).toBeVisible();
  expect(screen.getAllByRole("link", { name: "All cables" })[0]).toHaveAttribute(
    "href",
    "/views/saved-cables",
  );
});

test("a built-in view lists its items with their paths and who has them", async () => {
  stubPaths({
    "/api/views": { items: [lentOut, archive], next_cursor: null },
    "/api/views/lent-out": {
      items: [
        {
          kind: "item",
          item: { ...cable, status: "lent_out", lent_to: "Sam", lent_at: "2026-11-16T12:00:00Z" },
        },
      ],
      next_cursor: null,
    },
  });
  renderRoutes(routes, "/views/lent-out");
  expect(await screen.findByRole("heading", { level: 1, name: "Lent out" })).toBeVisible();
  const row = (await screen.findByRole("link", { name: "HDMI cable" })).closest("li");
  expect(row).toHaveTextContent(/Lent to Sam/);
  expect(screen.getByText("1 item")).toBeVisible();
});

test("an empty view says what it would list", async () => {
  stubPaths({
    "/api/views": { items: [lentOut, archive], next_cursor: null },
    "/api/views/archive": { items: [], next_cursor: null },
  });
  renderRoutes(routes, "/views/archive");
  expect(await screen.findByText("The archive is empty")).toBeVisible();
});

test("picking a category filter keeps only that category, in the address", async () => {
  stubPaths({
    "/api/categories": { items: [{ name: "Cables", item_count: 2 }], next_cursor: null },
    "/api/search": { results: [], next_cursor: null, count: 0 },
  });
  const { router } = renderRoutes(routes, "/search?q=");
  await userEvent.click(await screen.findByRole("checkbox", { name: "Category" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cables" }));
  expect(router.state.location.search).toBe("?q=&category=Cables");
  expect(await screen.findByRole("checkbox", { name: "Cables" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Save search" })).toBeVisible();
});
