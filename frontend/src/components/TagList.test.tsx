import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { TagList } from "./TagList";

test("renders linked tags and editing callbacks", async () => {
  const onRemove = vi.fn();
  const onAdd = vi.fn();
  const { user } = renderWithTheme(
    <TagList
      tags={["hdmi", "usb-c"]}
      tagHref={(tag) => `/search?tag=${tag}`}
      onRemoveTag={onRemove}
      onAddTag={onAdd}
    />,
  );

  expect(screen.getByRole("link", { name: "hdmi" })).toHaveAttribute("href", "/search?tag=hdmi");
  await user.click(screen.getByRole("button", { name: "Remove tag usb-c" }));
  expect(onRemove).toHaveBeenCalledWith("usb-c");

  await user.click(screen.getByRole("button", { name: "Add tag" }));
  expect(onAdd).toHaveBeenCalledOnce();
});
