import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { cable } from "@/lib/testing/routeTesting";
import { useItemSelection } from "./useItemSelection";

test("ticking a row selects it and brings the bar; another list starts with none", () => {
  const { result, rerender } = renderHook(({ list }) => useItemSelection(list), {
    initialProps: { list: "bin" },
  });
  expect(result.current.bar).toBeUndefined();
  act(() => result.current.select(cable).onChange(true));
  expect(result.current.select(cable).selected).toBe(true);
  expect(result.current.bar).toBeDefined();
  rerender({ list: "shelf" });
  expect(result.current.select(cable).selected).toBe(false);
  expect(result.current.bar).toBeUndefined();
});

test("unticking the last row ends the selection", () => {
  const { result } = renderHook(() => useItemSelection("bin"));
  act(() => result.current.select(cable).onChange(true));
  act(() => result.current.select(cable).onChange(false));
  expect(result.current.bar).toBeUndefined();
});
