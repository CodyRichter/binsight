import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { answer } from "@/lib/testing/routeTesting";
import { LabelPrintingSection } from "./LabelPrintingSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("an admin adds the print address where it is shown", async () => {
  const fetchMock = vi.fn((_path: string, init?: RequestInit) =>
    Promise.resolve(
      answer(200, {
        print_address: init?.method === "PATCH" ? "http://printer.local/print" : null,
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { user } = renderWithTheme(<LabelPrintingSection />);
  await user.click(
    await screen.findByRole("button", {
      name: "Print address: Add, to print labels from the app",
    }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Print address" }),
    "http://printer.local/print{Enter}",
  );
  expect(await screen.findByText("http://printer.local/print")).toBeVisible();
  const [, init] = fetchMock.mock.calls.at(-1) ?? [];
  expect(init?.method).toBe("PATCH");
  expect(JSON.parse(String(init?.body))).toEqual({ print_address: "http://printer.local/print" });
});
