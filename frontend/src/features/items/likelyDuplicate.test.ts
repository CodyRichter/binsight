import { expect, test } from "vitest";
import { likelyDuplicate } from "./likelyDuplicate";
import type { Item } from "./useItems";

function item(id: string, name: string | null): Item {
  return {
    id,
    name,
    quantity: 3,
    home_location_id: "cables",
    path: [],
    photo_url: null,
    created_at: "2026-11-16T12:00:00Z",
    deleted_at: null,
    status: "in_place",
    last_checked_at: null,
  };
}

const cables = [item("hdmi", "HDMI cable"), item("photo", null), item("usb", "USB-C charger")];

test("the same name in another case is a likely duplicate", () => {
  expect(likelyDuplicate(" hdmi CABLE ", cables)?.id).toBe("hdmi");
});

test("a different name is not", () => {
  expect(likelyDuplicate("HDMI", cables)).toBeUndefined();
  expect(likelyDuplicate("", cables)).toBeUndefined();
});

test("a row still being added is not offered", () => {
  expect(likelyDuplicate("Ethernet cable", [item("adding-1", "Ethernet cable")])).toBeUndefined();
});
