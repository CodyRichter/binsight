import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { CheckedStamp } from "./CheckedStamp";

const now = new Date("2026-06-15T12:00:00Z");
const day = 24 * 60 * 60 * 1000;

function checkedDaysAgo(days: number) {
  return new Date(now.getTime() - days * day);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

test.each([
  [0, "Checked today"],
  [1, "Checked yesterday"],
  [6, "Checked 6 days ago"],
  [7, "Checked last week"],
  [14, "Checked 2 weeks ago"],
  [29, "Checked 4 weeks ago"],
  [30, "Checked last month"],
  [729, "Checked 24 months ago"],
  [730, "Checked 2 years ago"],
])("%i days ago reads %j", (days, words) => {
  renderWithTheme(<CheckedStamp lastChecked={checkedDaysAgo(days)} />);
  expect(screen.getByText(words)).toBeInTheDocument();
});

// Staleness shows only in the icon and color, so it has no accessible name to query by.
test("a check up to a year old is not stale", () => {
  renderWithTheme(<CheckedStamp lastChecked={checkedDaysAgo(365)} />);
  expect(screen.getByText("Checked 12 months ago")).not.toHaveAttribute("data-stale");
});

test("a check over a year old is stale", () => {
  renderWithTheme(<CheckedStamp lastChecked={checkedDaysAgo(366)} />);
  expect(screen.getByText("Checked 12 months ago")).toHaveAttribute("data-stale");
});

test("never checked is stale", () => {
  renderWithTheme(<CheckedStamp lastChecked={null} />);
  expect(screen.getByText("Never checked")).toHaveAttribute("data-stale");
});
