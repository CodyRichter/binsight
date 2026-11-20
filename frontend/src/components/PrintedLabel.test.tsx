import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { PrintedLabel } from "./PrintedLabel";

test("wraps the label image in a clipped frame and marks the large sheet preview", () => {
  renderWithTheme(<PrintedLabel code="WQA-G5P" imageUrl="/api/labels/WQA-G5P.png" large />);
  const image = screen.getByRole("img", { name: "Label WQA-G5P" });
  expect(image).toHaveAttribute("src", "/api/labels/WQA-G5P.png");
  expect(image).not.toHaveAttribute("data-large");
  expect(image.parentElement).toHaveAttribute("data-large", "true");
});

test("omits the large marker for the compact contents-sheet label", () => {
  renderWithTheme(<PrintedLabel code="WQA-G5P" imageUrl="/api/labels/WQA-G5P.png" />);
  const image = screen.getByRole("img", { name: "Label WQA-G5P" });
  expect(image.parentElement).not.toHaveAttribute("data-large");
});
