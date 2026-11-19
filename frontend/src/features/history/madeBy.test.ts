import { expect, test } from "vitest";
import { madeBy } from "./madeBy";

test("a change says who made it, as You when it was this account", () => {
  expect(madeBy({ actor: "mcp", username: null }, "sam")).toBe("Claude");
  expect(madeBy({ actor: "app", username: "sam" }, "sam")).toBe("You");
  expect(madeBy({ actor: "app", username: "alex" }, "sam")).toBe("alex");
  expect(madeBy({ actor: "app", username: null }, "sam")).toBe("Someone");
});
