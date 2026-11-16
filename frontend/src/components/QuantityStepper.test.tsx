import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { QuantityStepper } from "./QuantityStepper";

function renderStepper(value: number) {
  const onChange = vi.fn();
  const rendered = renderWithTheme(<QuantityStepper value={value} onChange={onChange} />);
  return { ...rendered, onChange };
}

test("one fewer cannot go below one", () => {
  renderStepper(1);
  expect(screen.getByRole("button", { name: "One fewer" })).toBeDisabled();
});

test("the step buttons change the quantity by one", async () => {
  const { user, onChange } = renderStepper(3);
  await user.click(screen.getByRole("button", { name: "One fewer" }));
  await user.click(screen.getByRole("button", { name: "One more" }));
  expect(onChange.mock.calls).toEqual([[2], [4]]);
});

test("a typed whole number is accepted on Enter", async () => {
  const { user, onChange } = renderStepper(3);
  await user.click(screen.getByRole("button", { name: "Quantity 3, type a number" }));
  await user.keyboard("5{Enter}");
  expect(onChange).toHaveBeenCalledWith(5);
  expect(screen.queryByRole("textbox", { name: "Quantity" })).not.toBeInTheDocument();
});

test.each(["0", "-2", "abc", "", "2.5", "4abc", "3"])(
  "typing %j changes nothing",
  async (typed) => {
    const { user, onChange } = renderStepper(3);
    await user.click(screen.getByRole("button", { name: "Quantity 3, type a number" }));
    await user.clear(screen.getByRole("textbox", { name: "Quantity" }));
    await user.keyboard(`${typed}{Enter}`);
    expect(onChange).not.toHaveBeenCalled();
  },
);

test("Escape discards what was typed", async () => {
  const { user, onChange } = renderStepper(3);
  await user.click(screen.getByRole("button", { name: "Quantity 3, type a number" }));
  await user.keyboard("7{Escape}");
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Quantity 3, type a number" })).toBeInTheDocument();
});
