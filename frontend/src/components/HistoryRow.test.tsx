import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { HistoryRow } from "./HistoryRow";

const now = new Date("2026-06-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

test("a change says when and who made it", () => {
  renderWithTheme(<HistoryRow happened="Added" at={now} by="You" />);
  expect(screen.getByText("Added")).toBeInTheDocument();
  expect(screen.getByText("Today · You")).toBeInTheDocument();
});

test("a change long ago says how long ago", () => {
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  renderWithTheme(<HistoryRow happened="Added" at={twoWeeksAgo} by="Claude" />);
  expect(screen.getByText("2 weeks ago · Claude")).toBeInTheDocument();
});
