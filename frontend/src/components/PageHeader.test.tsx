import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { PageHeader } from "./PageHeader";

test("a deleted item's header says when it was deleted", () => {
  renderWithTheme(<PageHeader title="HDMI cable" since={{ words: "Deleted", at: new Date() }} />);
  expect(screen.getByText("Deleted today")).toBeInTheDocument();
});

test("a header with nothing deleted has no deleted line", () => {
  renderWithTheme(<PageHeader title="HDMI cable" />);
  expect(screen.queryByText(/Deleted/)).not.toBeInTheDocument();
});
