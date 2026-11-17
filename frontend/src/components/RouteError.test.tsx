import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { RouteError } from "./RouteError";

test("renders 404 details, recovery buttons, and navigation rows", async () => {
  const onGoHome = vi.fn();
  const onScan = vi.fn();
  const { user } = renderWithTheme(
    <RouteError
      error={{ status: 404, statusText: "Not Found", data: null, internal: true }}
      onGoHome={onGoHome}
      onScan={onScan}
    />,
    ["/design/missing-bin"],
  );

  expect(screen.getByRole("heading", { level: 1, name: "Nothing at this address" })).toBeVisible();
  expect(screen.getByText("There is no page at /design/missing-bin.")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Go home" }));
  expect(onGoHome).toHaveBeenCalledOnce();

  await user.click(screen.getByRole("button", { name: /Scan a label/ }));
  expect(onScan).toHaveBeenCalledOnce();
});

test("renders ApiError 404 message", () => {
  renderWithTheme(
    <RouteError error={new ApiError(404, "not_found", "No label has the code B-9999")} />,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "No label has the code B-9999" }),
  ).toBeVisible();
});

test("renders unreachable status row and Try again action", async () => {
  const onRetry = vi.fn();
  const { user } = renderWithTheme(
    <RouteError
      error={new ApiError(0, "network_error", "Can't reach Binsight.")}
      onRetry={onRetry}
    />,
    ["/locations/12"],
  );

  expect(screen.getByRole("heading", { level: 1, name: "Can't reach Binsight" })).toBeVisible();
  expect(screen.getByText("Offline")).toBeVisible();
  expect(screen.getByText("/locations/12")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});

test("renders 500 error details cleanly", async () => {
  const onRetry = vi.fn();
  const { user } = renderWithTheme(
    <RouteError error={new ApiError(500, "internal", "Database failed.")} onRetry={onRetry} />,
    ["/items/9"],
  );

  expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
  expect(screen.getByText("500 internal")).toBeVisible();
  expect(screen.getByText("Database failed.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});
