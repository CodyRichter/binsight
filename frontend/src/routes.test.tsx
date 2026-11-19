import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouteObject } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { DesignFrame } from "@/features/design";
import { ApiError } from "@/lib/api/client";
import {
  answer,
  bin,
  cable,
  renderRoutes,
  signedIn,
  signedInAs,
  site,
  stubPaths,
  visitor,
} from "@/lib/testing/routeTesting";
import { routes } from "./routes";

afterEach(() => {
  vi.unstubAllGlobals();
});

const signedOut = visitor;
const newInstall = { setup_needed: true, account: null };
const noCredentials = { items: [], next_cursor: null };
const credentialsPath = "/api/auth/mcp-credentials?limit=200";
const settingsLists: Record<string, unknown> = {
  [credentialsPath]: noCredentials,
  "/api/auth/accounts?limit=200": { items: [], next_cursor: null },
  "/api/labels?": { items: [], next_cursor: null },
  "/api/locations": { locations: [] },
  "/api/backups": { backups: [] },
};

/** Answers each request in turn; the last answer is repeated for any request after it. */
function stubBackend(...answers: (Response | Error)[]) {
  let next = 0;
  const fetchMock = vi.fn(() => {
    const given = answers[Math.min(next++, answers.length - 1)];
    if (given instanceof Error) return Promise.reject(given);
    return Promise.resolve(given.clone());
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function BrokenContent(): React.JSX.Element {
  throw new ApiError(500, "internal", "Database failed.");
}

function PageWithBrokenChild() {
  return (
    <DesignFrame>
      <BrokenContent />
    </DesignFrame>
  );
}

test("signed in, an unmatched route keeps the outer frame around the 404 message", async () => {
  stubBackend(answer(200, signedIn));
  renderRoutes(routes, "/does-not-exist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
});

test("render error inside Frame stays inside #content while keeping the outer frame mounted", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const [root] = routes;
  const devGroup = root.children?.[0];
  const withBroken: RouteObject[] = [
    {
      Component: root.Component,
      ErrorBoundary: root.ErrorBoundary,
      children: devGroup
        ? [
            {
              ErrorBoundary: devGroup.ErrorBoundary,
              children: [{ path: "/design/broken", Component: PageWithBrokenChild }],
            },
          ]
        : [],
    },
  ];
  renderRoutes(withBroken, "/design/broken");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
  ).toBeVisible();
  expect(screen.getByText("Database failed.")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  consoleError.mockRestore();
});

test("an unreachable backend says so inside the frame, and Try again recovers", async () => {
  stubBackend(new TypeError("Failed to fetch"), answer(200, signedIn));
  renderRoutes(routes, "/does-not-exist");
  expect(await screen.findByText("Can't reach Binsight")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.queryByText("Can't reach Binsight")).not.toBeInTheDocument();
});

test("a failure on the backend shows Something went wrong inside the frame", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  stubBackend(
    answer(500, { error: { code: "internal", message: "Database failed.", details: {} } }),
  );
  renderRoutes(routes, "/does-not-exist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  consoleError.mockRestore();
});

test("signed out, a page for accounts sends you to the Gate for a username and password", async () => {
  stubBackend(answer(200, signedOut));
  renderRoutes(routes, "/settings");
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(screen.getByLabelText("Username")).toBeVisible();
  expect(screen.getAllByLabelText(/password/i)).toHaveLength(1);
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

test("a new install asks for the first admin's username and the password twice", async () => {
  stubBackend(answer(200, newInstall));
  renderRoutes(routes, "/");
  expect(await screen.findByRole("button", { name: "Create account" })).toBeVisible();
  expect(screen.getByLabelText("Username")).toBeVisible();
  expect(screen.getByLabelText("Password")).toBeVisible();
  expect(screen.getByLabelText("Repeat password")).toBeVisible();
});

test("signing in returns to the address that was asked for", async () => {
  let signedInNow = false;
  const fetchMock = vi.fn((path: string) => {
    if (path === "/api/auth/sign-in") signedInNow = true;
    if (path in settingsLists) return Promise.resolve(answer(200, settingsLists[path]));
    return Promise.resolve(answer(200, signedInNow ? signedIn : signedOut));
  });
  vi.stubGlobal("fetch", fetchMock);
  renderRoutes(routes, "/settings");
  await userEvent.type(await screen.findByLabelText("Username"), "sam");
  await userEvent.type(screen.getByLabelText("Password"), "correct horse");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-in", expect.anything());
});

test("a wrong sign-in shows the backend's sentence and stays on the Gate", async () => {
  const wrong = "That username or password is wrong. Try again.";
  stubBackend(
    answer(200, signedOut),
    answer(401, { error: { code: "wrong_sign_in", message: wrong, details: {} } }),
  );
  renderRoutes(routes, "/login");
  await userEvent.type(await screen.findByLabelText("Username"), "sam");
  await userEvent.type(screen.getByLabelText("Password"), "wrong horse");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText(wrong)).toBeVisible();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("passwords that differ are caught before anything is sent", async () => {
  const fetchMock = stubBackend(answer(200, newInstall));
  renderRoutes(routes, "/login");
  await userEvent.type(await screen.findByLabelText("Username"), "sam");
  await userEvent.type(screen.getByLabelText("Password"), "correct horse");
  await userEvent.type(screen.getByLabelText("Repeat password"), "correct hose");
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("The passwords differ. Type them again.")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("signing out sends the page to the Gate, ready to return to it", async () => {
  let signedInNow = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      if (path === "/api/auth/sign-out") {
        signedInNow = false;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (path in settingsLists) return Promise.resolve(answer(200, settingsLists[path]));
      return Promise.resolve(answer(200, signedInNow ? signedIn : signedOut));
    }),
  );
  renderRoutes(routes, "/settings");
  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

const added = { id: "e1", at: "2026-11-16T12:00:00Z", actor: "app", action: "item.created" };

test("/ shows the sites as a tree under Locations", async () => {
  stubPaths({ "/api/locations": { locations: [site, bin] } });
  renderRoutes(routes, "/");
  expect(await screen.findByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  expect(screen.getByText("1 site")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Expand Home" }));
  expect(screen.getByRole("link", { name: "Cables" })).toBeVisible();
});

test("/locations/{id} shows the location's items", async () => {
  stubPaths({
    "/api/locations": { locations: [site, bin] },
    "/api/items": { items: [cable], next_cursor: null },
  });
  renderRoutes(routes, "/locations/cables");
  expect(await screen.findByRole("heading", { level: 1, name: "Cables" })).toBeVisible();
  expect(await screen.findByRole("link", { name: "HDMI cable" })).toBeVisible();
});

test("signed out, a location's page reads without its add bar, Move or More's changes", async () => {
  const many = { ...cable, quantity: 3 };
  stubPaths({
    "/api/auth/status": visitor,
    "/api/locations": { locations: [site, bin] },
    "/api/items": { items: [many], next_cursor: null },
  });
  renderRoutes(routes, "/locations/cables");
  expect(await screen.findByRole("link", { name: "HDMI cable" })).toBeVisible();
  expect(screen.getByText("×3")).toBeVisible();
  expect(screen.queryByRole("textbox", { name: "Add an item" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Move/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Name: Cables" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Label cables" })).toBeVisible();
  expect(screen.getAllByRole("link", { name: "Sign in" }).length).toBeGreaterThan(0);
});

test("an editor's location page has its add bar and Move", async () => {
  stubPaths({
    "/api/auth/status": signedInAs("editor"),
    "/api/locations": { locations: [site, bin] },
    "/api/items": { items: [cable], next_cursor: null },
  });
  renderRoutes(routes, "/locations/cables");
  expect(await screen.findByRole("textbox", { name: "Add an item" })).toBeVisible();
  expect(await screen.findByRole("button", { name: "Move HDMI cable" })).toBeVisible();
});

test("a viewer's settings show their account but not the admin's sections", async () => {
  stubPaths({ "/api/auth/status": signedInAs("viewer") });
  renderRoutes(routes, "/settings");
  expect(await screen.findByText("sam · View")).toBeVisible();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Accounts" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "MCP credentials" })).not.toBeInTheDocument();
});

test("/locations/{id} for a deleted location says so and offers Restore", async () => {
  const deleted = { ...bin, deleted_at: "2026-11-16T12:00:00Z" };
  stubPaths({ "/api/locations": { locations: [site] }, "/api/locations/cables": deleted });
  renderRoutes(routes, "/locations/cables");
  expect(await screen.findByRole("heading", { level: 1, name: "Cables" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Restore" })).toBeVisible();
  expect(screen.getByText(/^Deleted/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Move" })).not.toBeInTheDocument();
});

test("/locations/{id} for a location that does not exist says so", async () => {
  const missing = { code: "location_not_found", message: "That location does not exist." };
  stubPaths({
    "/api/locations": { locations: [site] },
    "/api/locations/made-up": answer(404, { error: { ...missing, details: {} } }),
  });
  renderRoutes(routes, "/locations/made-up");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
});

test("/items/{id} shows the item's path, quantity and history", async () => {
  stubPaths({
    "/api/items/hdmi": cable,
    "/api/history": { items: [{ ...added, changes: [] }], next_cursor: null },
  });
  renderRoutes(routes, "/items/hdmi");
  expect(await screen.findByRole("heading", { level: 1, name: "HDMI cable" })).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Path" })).toHaveTextContent("HomeCables");
  expect(screen.getByRole("button", { name: "Quantity 3, type a number" })).toBeVisible();
  expect(await screen.findByText("Added")).toBeVisible();
});

const photoItem = {
  ...cable,
  id: "photo",
  name: null,
  quantity: 1,
  photo_url: "/api/attachments/a1/file",
};

test("/inbox lists an item with no name as Unnamed, with its photo and path", async () => {
  stubPaths({
    "/api/items/inbox": { items: [photoItem], next_cursor: null },
    "/api/items/inbox/count": { count: 1 },
  });
  renderRoutes(routes, "/inbox");
  expect(await screen.findByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
  const row = await screen.findByRole("link", { name: "Unnamed" });
  expect(row).toHaveAttribute("href", "/items/photo");
  expect(screen.getByText("1 item")).toBeVisible();
  expect(row.closest("li")).toHaveTextContent("UnnamedHomeCables");
  expect(screen.getByRole("link", { name: "Inbox 1" })).toHaveAttribute("aria-current", "page");
});

test("/inbox with nothing in it says Nothing is missing", async () => {
  stubPaths({ "/api/items/inbox": { items: [], next_cursor: null } });
  renderRoutes(routes, "/inbox");
  expect(await screen.findByText("Nothing is missing")).toBeVisible();
});

test("Add in the bottom bar opens the add sheet, adding to the inbox", async () => {
  stubPaths({ "/api/locations": { locations: [site, bin] } });
  renderRoutes(routes, "/");
  await userEvent.click(await screen.findByRole("button", { name: "Add" }));
  expect(await screen.findByRole("button", { name: /^Add to Inbox/ })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Add an item" })).toBeInTheDocument();
});
