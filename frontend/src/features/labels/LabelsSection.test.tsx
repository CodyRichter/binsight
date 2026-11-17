import { screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { LabelsSection } from "./LabelsSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

const createdAt = "2026-11-17T09:00:00Z";
const cables = {
  id: "cables",
  name: "Cables",
  type: "bin",
  parent_id: null,
  summary: null,
  label_code: "B-002",
  path: [],
  direct_item_count: 0,
  item_count: 0,
};
const answers: Record<string, unknown> = {
  "/api/labels?": {
    items: [
      { code: "B-002", location_id: "cables", claimed_at: createdAt, created_at: createdAt },
      { code: "B-001", location_id: null, claimed_at: null, created_at: createdAt },
    ],
    next_cursor: null,
  },
  "/api/locations": { locations: [cables] },
};

function stubBackend() {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        new Response(JSON.stringify(answers[path]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  );
}

test("a claimed label is named by its location and a blank one says Blank", async () => {
  stubBackend();
  renderWithTheme(<LabelsSection />);
  const [claimed, blank] = await screen.findAllByRole("listitem");
  expect(await within(claimed).findByText("Cables")).toBeVisible();
  expect(within(claimed).getByText("B-002")).not.toHaveAttribute("data-blank");
  expect(within(blank).getByText("Blank")).toBeVisible();
  expect(within(blank).getByText("B-001")).toHaveAttribute("data-blank");
  expect(within(blank).getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "/api/labels/B-001/image",
  );
  expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
});
