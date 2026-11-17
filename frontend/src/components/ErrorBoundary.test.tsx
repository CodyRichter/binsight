import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldThrow = true;

function Boom() {
  if (shouldThrow) throw new Error("Render crash");
  return <p>Recovered content</p>;
}

test("catches render errors inside the boundary and recovers on Try again", async () => {
  shouldThrow = true;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const { user } = renderWithTheme(
    <>
      <header>Outer bar</header>
      <main>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </main>
    </>,
  );

  expect(screen.getByText("Outer bar")).toBeVisible();
  expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();

  shouldThrow = false;
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Recovered content")).toBeVisible();
  consoleError.mockRestore();
});
