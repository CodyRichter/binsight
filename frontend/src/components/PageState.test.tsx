import { Button } from "@mantine/core";
import { act, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { PageState } from "./PageState";

afterEach(() => {
  vi.useRealTimers();
});

test("loading stays blank for the first second then shows Still loading", () => {
  vi.useFakeTimers();
  const { container } = renderWithTheme(<PageState status="loading" />);
  expect(screen.queryByText("Still loading")).not.toBeInTheDocument();
  expect(container.querySelector("h1, h2")).toBeNull();

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(screen.getByRole("heading", { name: "Still loading" })).toBeInTheDocument();
});

test("unreachable renders Try again action", async () => {
  const onRetry = vi.fn();
  const { user } = renderWithTheme(<PageState status="unreachable" standalone onRetry={onRetry} />);
  expect(screen.getByRole("heading", { level: 1, name: "Can't reach Binsight" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});

test("notFound and empty show their configured messages", () => {
  renderWithTheme(
    <PageState
      status="notFound"
      standalone
      notFound={{
        statement: "No label has the code B-9999",
        action: <Button onClick={vi.fn()}>Scan another</Button>,
      }}
    />,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "No label has the code B-9999" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Scan another" })).toBeVisible();
});

test("ready renders children", () => {
  renderWithTheme(
    <PageState status="ready">
      <p>Loaded contents</p>
    </PageState>,
  );
  expect(screen.getByText("Loaded contents")).toBeVisible();
});
