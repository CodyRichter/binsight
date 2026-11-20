import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { LocationHeader } from "./LocationHeader";
import { LocationShownHeader } from "./LocationShownHeader";
import type { Location } from "./useLocations";

function sampleLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "K7Q-4MZ",
    name: "Spare cables",
    type: "bin",
    icon: null,
    own_item_id: null,
    parent_id: "H4P-2RN",
    summary: null,
    path: [
      { id: "H4P-2RN", name: "Garage", type: "site" },
      { id: "K7Q-4MZ", name: "Spare cables", type: "bin" },
    ],
    direct_item_count: 3,
    item_count: 3,
    photo_url: null,
    deleted_at: null,
    ...overrides,
  };
}

test("LocationHeader opens the label sheet from the code chip without a separate Label button", async () => {
  const { user } = renderWithTheme(
    <LocationHeader location={sampleLocation()} hasChildren={false} />,
  );
  expect(screen.queryByRole("button", { name: "Label" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Label K7Q-4MZ" }));
  const dialog = await screen.findByRole("dialog", { name: "Label" });
  expect(dialog).toBeVisible();
  expect(screen.getByRole("img", { name: "Label K7Q-4MZ" })).toHaveAttribute(
    "src",
    "/api/labels/K7Q-4MZ/image",
  );
});

test("LocationShownHeader opens the label sheet from the code chip without a separate Label button", async () => {
  const { user } = renderWithTheme(<LocationShownHeader location={sampleLocation()} />);
  expect(screen.queryByRole("button", { name: "Label" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Label K7Q-4MZ" }));
  expect(await screen.findByRole("dialog", { name: "Label" })).toBeVisible();
});
