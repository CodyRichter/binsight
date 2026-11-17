import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { DuplicateSuggestion } from "./DuplicateSuggestion";

test("renders duplicate message and triggers add-to-existing callback", async () => {
  const onAccept = vi.fn();
  const { user } = renderWithTheme(
    <DuplicateSuggestion message="AA batteries is already here" onAccept={onAccept} />,
  );

  expect(screen.getByText("AA batteries is already here")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add to existing" }));
  expect(onAccept).toHaveBeenCalledOnce();
});
