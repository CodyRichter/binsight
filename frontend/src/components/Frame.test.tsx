import { screen } from "@testing-library/react";
import { useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { Frame } from "./Frame";

function Address() {
  return <output aria-label="Address">{useLocation().pathname}</output>;
}

function renderFrame(
  history: string[],
  {
    selectionBar,
    destination,
    inboxCount = 0,
    actions = { onAdd: vi.fn(), onScan: vi.fn() },
  }: {
    selectionBar?: React.ReactNode;
    destination?: boolean;
    inboxCount?: number;
    actions?: { onAdd?: () => void; onScan?: () => void };
  } = {},
) {
  return renderWithTheme(
    <Frame
      navigation={{ current: "home", inboxCount }}
      search={{ query: "", onChange: vi.fn() }}
      actions={actions}
      parent="/locations/1"
      destination={destination}
      selectionBar={selectionBar}
    >
      <Address />
    </Frame>,
    history,
  );
}

test("a destination's page has no Back, whatever its address", () => {
  renderFrame(["/search", "/design/settings"], { destination: true });
  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
});

test("a page that is not a destination has Back, whatever its address", () => {
  renderFrame(["/search", "/settings"]);
  expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
});

test("Back goes to the previous page in the app", async () => {
  const { user } = renderFrame(["/search", "/items/4"]);
  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("status", { name: "Address" })).toHaveTextContent("/search");
});

test("Back on the first page of a visit goes to the parent", async () => {
  const { user } = renderFrame(["/items/4"]);
  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("status", { name: "Address" })).toHaveTextContent("/locations/1");
});

test("only one navigation is in the page", () => {
  renderFrame(["/"]);
  expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
});

test("the selection bar takes the bottom bar's place", () => {
  renderFrame(["/locations/1"], { selectionBar: <p>2 selected</p> });
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

test("omitted actions are not rendered in the skeleton", () => {
  renderFrame(["/"], { actions: {}, destination: true });
  expect(screen.queryByRole("button", { name: "Scan" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
});

test("bottom bar announces inbox count separately from the label", () => {
  renderFrame(["/"], { inboxCount: 3, destination: true });
  expect(screen.getByRole("link", { name: "Inbox, 3" })).toBeInTheDocument();
});
