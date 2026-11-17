import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { markedText } from "./markedText";

test("each matched part is marked and the rest is kept", () => {
  const { container } = render(
    <p>
      {markedText(
        "USB-C to HDMI cable",
        [
          { start: 9, end: 13 },
          { start: 14, end: 17 },
        ],
        "m",
      )}
    </p>,
  );
  expect(screen.getAllByRole("mark").map((mark) => mark.textContent)).toEqual(["HDMI", "cab"]);
  expect(container).toHaveTextContent("USB-C to HDMI cable");
});

test("a name with no marks is plain text", () => {
  render(<p>{markedText("AA batteries", [], "m")}</p>);
  expect(screen.queryByRole("mark")).not.toBeInTheDocument();
});
