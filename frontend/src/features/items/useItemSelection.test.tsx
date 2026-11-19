import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { testQueryClient } from "@/lib/testing/renderWithTheme";
import { cable, visitor } from "@/lib/testing/routeTesting";
import { useItemSelection } from "./useItemSelection";

function signedIn(status = testQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={status}>{children}</QueryClientProvider>;
  };
}

test("ticking a row selects it and brings the bar; another list starts with none", () => {
  const { result, rerender } = renderHook(({ list }) => useItemSelection(list), {
    initialProps: { list: "bin" },
    wrapper: signedIn(),
  });
  expect(result.current.bar).toBeUndefined();
  act(() => result.current.select?.(cable).onChange(true));
  expect(result.current.select?.(cable).selected).toBe(true);
  expect(result.current.bar).toBeDefined();
  rerender({ list: "shelf" });
  expect(result.current.select?.(cable).selected).toBe(false);
  expect(result.current.bar).toBeUndefined();
});

test("unticking the last row ends the selection", () => {
  const { result } = renderHook(() => useItemSelection("bin"), { wrapper: signedIn() });
  act(() => result.current.select?.(cable).onChange(true));
  act(() => result.current.select?.(cable).onChange(false));
  expect(result.current.bar).toBeUndefined();
});

test("a visitor's rows have no select box", () => {
  const { result } = renderHook(() => useItemSelection("bin"), {
    wrapper: signedIn(testQueryClient(visitor)),
  });
  expect(result.current.select).toBeUndefined();
});
