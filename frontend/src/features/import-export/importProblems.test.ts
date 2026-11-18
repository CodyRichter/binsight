import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { importProblems, problemText } from "./importProblems";

describe("importProblems", () => {
  it("reads the rows a refused import names", () => {
    const rows = [{ row: 3, column: "price", message: "Not a number." }];
    const error = new ApiError(422, "import_rows_invalid", "Nothing was imported", { rows });
    expect(importProblems(error)).toEqual(rows);
  });

  it("finds none in any other refusal", () => {
    expect(importProblems(new ApiError(422, "unsupported_file", "Send a CSV file."))).toEqual([]);
  });

  it("names the column when there is one", () => {
    expect(problemText({ row: 2, column: "price", message: "Not a number." })).toBe(
      "price: Not a number.",
    );
    expect(problemText({ row: 2, column: null, message: "Fill this in." })).toBe("Fill this in.");
  });
});
