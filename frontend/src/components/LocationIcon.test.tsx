import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { LocationIcon } from "./LocationIcon";

const fridge = [["path", { d: "M5 10h14" }]];

function stubIconFiles() {
  const files = vi.fn((path: string) =>
    Promise.resolve(
      path === "/icons/fridge.json"
        ? Response.json(fridge)
        : new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } }),
    ),
  );
  vi.stubGlobal("fetch", files);
  return files;
}

test("a chosen icon replaces the type's once its drawing has loaded", async () => {
  stubIconFiles();
  const { container } = renderWithTheme(<LocationIcon type="bin" icon="fridge" size={20} />);
  expect(container.querySelector("svg")).toHaveClass("tabler-icon-box");
  await expect
    .poll(() => container.querySelector("svg")?.classList.contains("tabler-icon-fridge"))
    .toBe(true);
});

test("an icon Tabler doesn't have shows the type's", async () => {
  const files = stubIconFiles();
  const { container } = renderWithTheme(
    <LocationIcon type="drawer" icon="no-such-icon" size={20} />,
  );
  await expect.poll(() => files.mock.calls.length).toBe(1);
  expect(container.querySelector("svg")).toHaveClass("tabler-icon-archive");
});
