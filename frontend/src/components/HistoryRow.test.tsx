import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { HistoryRow } from "./HistoryRow";

const now = new Date("2026-06-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

test("a change made in the app says when and that you made it", () => {
  renderWithTheme(<HistoryRow happened="Added" at={now} actor="app" />);
  expect(screen.getByText("Added")).toBeInTheDocument();
  expect(screen.getByText("Today · You")).toBeInTheDocument();
});

test("a change made through MCP says Claude made it", () => {
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  renderWithTheme(<HistoryRow happened="Added" at={twoWeeksAgo} actor="mcp" />);
  expect(screen.getByText("2 weeks ago · Claude")).toBeInTheDocument();
});
