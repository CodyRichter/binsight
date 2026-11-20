import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { memoryStorage } from "@/lib/testing/memoryStorage";
import { bin, cable, renderRoutes, site, stubPaths } from "@/lib/testing/routeTesting";
import { routes } from "./routes";

const garage = { ...site, id: "garage", name: "Garage", path: [{ id: "garage", name: "Garage" }] };
const shelf = {
  ...bin,
  id: "shelf",
  name: "Shelf",
  type: "shelf",
  parent_id: "garage",
  path: [...garage.path, { id: "shelf", name: "Shelf" }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(window.matchMedia).mockImplementation(matchingWidths(0));
});

/** A window this many em wide: min-width queries up to it match, nothing else does. */
function matchingWidths(em: number) {
  return (query: string) => {
    const minimum = /min-width: ([\d.]+)em/.exec(query);
    return {
      matches: minimum !== null && Number(minimum[1]) <= em,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };
}

function openWindow(em: number, address: string) {
  vi.mocked(window.matchMedia).mockImplementation(matchingWidths(em));
  stubPaths({
    "/api/locations": { locations: [site, bin, garage, shelf] },
    "/api/items": { items: [cable], next_cursor: null },
  });
  return renderRoutes(routes, address);
}

test("at the widest, a location's page lights it in the pane with its branch open", async () => {
  openWindow(90, "/locations/cables");
  const pane = await screen.findByRole("complementary", { name: "Locations" });
  const current = await within(pane).findByRole("link", { name: "Cables" });
  expect(current).toHaveAttribute("aria-current", "page");
  expect(within(pane).getByRole("button", { name: "Collapse Home" })).toBeVisible();
});

test("a pane row opens its location", async () => {
  openWindow(90, "/locations/cables");
  const pane = await screen.findByRole("complementary", { name: "Locations" });
  await userEvent.click(await within(pane).findByRole("link", { name: "Home" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});

test("branches opened in the pane stay open on the next page", async () => {
  const { router } = openWindow(90, "/locations/cables");
  const pane = await screen.findByRole("complementary", { name: "Locations" });
  await userEvent.click(await within(pane).findByRole("button", { name: "Expand Garage" }));
  await act(() => router.navigate("/items/hdmi"));
  await act(() => router.navigate("/locations/home"));
  const after = await screen.findByRole("complementary", { name: "Locations" });
  expect(await within(after).findByRole("link", { name: "Shelf" })).toBeVisible();
});

test("the home page, already the tree, has no pane", async () => {
  openWindow(90, "/");
  expect(await screen.findByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  expect(screen.queryByRole("complementary", { name: "Locations" })).not.toBeInTheDocument();
});

test("below the widest arrangement the pane is not rendered", async () => {
  openWindow(70, "/locations/cables");
  expect(await screen.findByRole("heading", { level: 1, name: "Cables" })).toBeVisible();
  expect(screen.queryByRole("complementary", { name: "Locations" })).not.toBeInTheDocument();
});

test("the pane is one tab stop, its lit row, and the arrow keys move and open rows", async () => {
  openWindow(90, "/locations/cables");
  const pane = await screen.findByRole("complementary", { name: "Locations" });
  const current = await within(pane).findByRole("link", { name: "Cables" });
  const stops = within(pane)
    .getAllByRole("link")
    .concat(within(pane).getAllByRole("button"))
    .filter((control) => control.tabIndex === 0);
  expect(stops).toEqual([current]);
  current.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(within(pane).getByRole("link", { name: "Garage" })).toHaveFocus();
  await userEvent.keyboard("{ArrowRight}");
  expect(within(pane).getByRole("link", { name: "Shelf" })).toBeVisible();
});

test("the pane names its rows without their codes", async () => {
  openWindow(90, "/locations/cables");
  const pane = await screen.findByRole("complementary", { name: "Locations" });
  await within(pane).findByRole("link", { name: "Cables" });
  expect(within(pane).queryByText("cables")).not.toBeInTheDocument();
});

test("the navigation collapses to its icons, keeps their names, and stays collapsed", async () => {
  vi.stubGlobal("localStorage", memoryStorage());
  const { unmount } = openWindow(70, "/");
  await userEvent.click(await screen.findByRole("button", { name: "Collapse navigation" }));
  const navigation = screen.getByRole("navigation", { name: "Main" });
  expect(within(navigation).getByRole("link", { name: "Home" })).toBeInTheDocument();
  unmount();
  openWindow(70, "/");
  expect(await screen.findByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
});
