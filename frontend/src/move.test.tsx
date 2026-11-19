import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { answer, bin, cable, renderRoutes, signedIn, site } from "@/lib/testing/routeTesting";
import { routes } from "./routes";
import { memoryStorage } from "@/lib/testing/memoryStorage";

const detect = vi.fn<() => Promise<{ rawValue: string }[]>>();
vi.mock("@/features/scan/detector", () => ({ qrDetector: () => ({ detect }) }));

const tools = {
  ...bin,
  id: "K7Q-4MZ",
  name: "Tools",
  path: [...site.path, { id: "K7Q-4MZ", name: "Tools", type: "bin" }],
};
const box = {
  ...bin,
  id: "B0X-016",
  name: "Small box",
  parent_id: "cables",
  path: [...bin.path, { id: "B0X-016", name: "Small box", type: "bin" }],
};
const charger = { ...cable, id: "charger", name: "USB-C charger", quantity: 1 };

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function home(moved = vi.fn(), answered = true) {
  const fetchStub = vi.fn((path: string, init?: RequestInit) => {
    const route = String(path).split("?")[0];
    if (init?.method === "POST") moved(route, init.body);
    if (init?.method === "POST" && !answered) return new Promise<Response>(() => undefined);
    const answers: Record<string, unknown> = {
      "/api/auth/status": signedIn,
      "/api/items/inbox/count": { count: 0 },
      "/api/locations": { locations: [site, bin, tools, box] },
      "/api/items": { items: [cable, charger], next_cursor: null },
      "/api/items/charger/move": {
        ...charger,
        home_location_id: "K7Q-4MZ",
        history_entry_id: "e1",
      },
      "/api/locations/cables/move": { ...bin, parent_id: "K7Q-4MZ", history_entry_id: "e2" },
    };
    return Promise.resolve(answer(200, answers[route]));
  });
  vi.stubGlobal("fetch", fetchStub);
  return moved;
}

test("moving an item from a location's list takes it out before the answer comes", async () => {
  const moved = home(vi.fn(), false);
  renderRoutes(routes, "/locations/cables");
  await userEvent.click(await screen.findByRole("button", { name: "Move USB-C charger" }));
  const sheet = await screen.findByRole("dialog", { name: "Move to" });
  expect(within(sheet).queryByRole("button", { name: /^Cables/ })).toBeNull();
  await userEvent.click(within(sheet).getByRole("button", { name: /^Tools/ }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "USB-C charger" })).toBeNull());
  expect(screen.getByRole("link", { name: "HDMI cable" })).toBeVisible();
  expect(moved).toHaveBeenCalledWith("/api/items/charger/move", '{"location_id":"K7Q-4MZ"}');
});

test("a bin's move sheet leaves out what is inside it, and a scanned label moves it there", async () => {
  const moved = home();
  renderRoutes(routes, "/locations/cables");
  await userEvent.click(await screen.findByRole("button", { name: "Move" }));
  const sheet = await screen.findByRole("dialog", { name: "Move to" });
  expect(within(sheet).queryByRole("button", { name: /^Small box/ })).toBeNull();
  detect.mockResolvedValue([{ rawValue: "https://binsight.example/l/B0X-016" }]);
  await userEvent.click(within(sheet).getByRole("button", { name: "Scan destination" }));
  expect(await within(sheet).findByText("Can't move into Small box")).toBeVisible();
  detect.mockResolvedValue([{ rawValue: "https://binsight.example/l/K7Q-4MZ" }]);
  expect(await screen.findByText("Moved to Tools")).toBeVisible();
  expect(moved).toHaveBeenCalledWith("/api/locations/cables/move", '{"parent_id":"K7Q-4MZ"}');
});

test("/scan opens a scanned label's page, and a typed code does the same", async () => {
  home();
  detect.mockResolvedValue([{ rawValue: "a shopping list" }]);
  const { router } = renderRoutes(routes, "/scan");
  expect(await screen.findByText("That isn't a Binsight label")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Type the code" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Code" }), "k7q4mz{Enter}");
  await waitFor(() => expect(router.state.location.pathname).toBe("/locations/K7Q-4MZ"));
});

test("/scan says how to allow the camera when it is refused", async () => {
  home();
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: () => Promise.reject(new Error("NotAllowedError")) },
  });
  renderRoutes(routes, "/scan");
  expect(await screen.findByText(/Allow the camera/)).toBeVisible();
});
