import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { EmptyState } from "./EmptyState";

test("standalone empty state renders a level-1 heading", () => {
  renderWithTheme(<EmptyState standalone statement="No label has the code B-9999" />);
  expect(
    screen.getByRole("heading", { level: 1, name: "No label has the code B-9999" }),
  ).toBeInTheDocument();
});

test("in-page empty state renders a level-2 heading", () => {
  renderWithTheme(<EmptyState statement="This bin is empty" />);
  expect(screen.getByRole("heading", { level: 2, name: "This bin is empty" })).toBeInTheDocument();
});
