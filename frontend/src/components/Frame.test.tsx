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
  { selectionBar, destination }: { selectionBar?: React.ReactNode; destination?: boolean } = {},
) {
  return renderWithTheme(
    <Frame
      navigation={{ current: "home", inboxCount: 0 }}
      views={[]}
      search={{ query: "", onChange: vi.fn() }}
      actions={{ onAdd: vi.fn(), onScan: vi.fn() }}
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
