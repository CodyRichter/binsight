import { expect, test } from "vitest";
import { newLocationType } from "./newLocationType";
import type { Location } from "./useLocations";

function parent(type: Location["type"]): Location {
  return {
    id: "parent",
    name: "Parent",
    type,
    parent_id: null,
    summary: null,
    icon: null,
    path: [],
    direct_item_count: 0,
    photo_url: null,
    deleted_at: null,
    item_count: 0,
  };
}

test.each([
  [undefined, "site"],
  [parent("site"), "room"],
  [parent("room"), "bin"],
  [parent("shelf"), "bin"],
  [parent("bin"), "bin"],
])("inside %o a new location is a %s", (inside, type) => {
  expect(newLocationType(inside)).toBe(type);
});
