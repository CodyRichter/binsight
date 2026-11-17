import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { LocationRow } from "./LocationRow";

test("the add-inside button names its location and is apart from picking the row", async () => {
  const onPick = vi.fn();
  const onAddInside = vi.fn();
  const { user } = renderWithTheme(
    <ul>
      <LocationRow
        name="Garage"
        locationType="room"
        itemCount={3}
        onPick={onPick}
        onAddInside={onAddInside}
        tree
        depth={0}
      />
    </ul>,
  );
  await user.click(screen.getByRole("button", { name: "Add location inside Garage" }));
  expect(onAddInside).toHaveBeenCalledOnce();
  expect(onPick).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Garage" }));
  expect(onPick).toHaveBeenCalledOnce();
});

test("a row without add-inside has no such button", () => {
  renderWithTheme(
    <ul>
      <LocationRow name="Garage" locationType="room" itemCount={3} to="/locations/garage" />
    </ul>,
  );
  expect(screen.queryByRole("button", { name: /Add location inside/ })).toBeNull();
});
