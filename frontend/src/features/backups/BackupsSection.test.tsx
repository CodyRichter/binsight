import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { BackupsSection } from "./BackupsSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

const older = { name: "20261117T030000Z", taken_at: "2026-11-17T03:00:00Z", size: 820_000 };
const newer = { name: "20261118T120000Z", taken_at: "2026-11-18T12:00:00Z", size: 12_430_000 };

function stubBackend() {
  let kept = [older];
  const answer = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal(
    "fetch",
    vi.fn((_path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        kept = [newer, ...kept];
        return answer(newer, 201);
      }
      return answer({ backups: kept });
    }),
  );
}

test("each backup shows its size, and Back up now adds the new one to the top", async () => {
  stubBackend();
  renderWithTheme(<BackupsSection />);
  const [only] = await screen.findAllByRole("listitem");
  expect(within(only).getByText("820 KB")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Back up now" }));
  expect(await screen.findByText("12.4 MB")).toBeVisible();
  const [first] = screen.getAllByRole("listitem");
  expect(within(first).getByText("12.4 MB")).toBeVisible();
});
