import { notifications } from "@mantine/notifications";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { showToast } from "./toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => notifications.clean());
});

function show(shape: Parameters<typeof showToast>[0]) {
  renderWithTheme(<></>);
  act(() => showToast(shape));
}

// Closing chains timers through React effects, so time moves in steps that let each effect run.
function wait(milliseconds: number) {
  for (let left = milliseconds; left > 0; left -= 50) {
    act(() => vi.advanceTimersByTime(Math.min(50, left)));
  }
}

function tap(name: string) {
  act(() => fireEvent.click(screen.getByRole("button", { name })));
}

test("an undo toast closes after six seconds", () => {
  show({ message: "Moved to Shelf 2", onUndo: vi.fn() });
  wait(5999);
  expect(screen.getByRole("status")).toHaveTextContent("Moved to Shelf 2");
  wait(1000);
  expect(screen.queryByText("Moved to Shelf 2")).not.toBeInTheDocument();
});

test("undo runs and closes the toast", () => {
  const onUndo = vi.fn();
  show({ message: "Moved to Shelf 2", onUndo });
  tap("Undo");
  wait(1000);
  expect(onUndo).toHaveBeenCalledOnce();
  expect(screen.queryByText("Moved to Shelf 2")).not.toBeInTheDocument();
});

test("a refusal is announced once and stays until dismissed", () => {
  show({ message: "Could not move it", onRetry: vi.fn() });
  wait(60_000);
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not move it");
  tap("Close");
  wait(1000);
  expect(screen.queryByText("Could not move it")).not.toBeInTheDocument();
});

test("retry runs and closes the refusal", () => {
  const onRetry = vi.fn();
  show({ message: "Could not move it", onRetry });
  tap("Retry");
  wait(1000);
  expect(onRetry).toHaveBeenCalledOnce();
  expect(screen.queryByText("Could not move it")).not.toBeInTheDocument();
});
