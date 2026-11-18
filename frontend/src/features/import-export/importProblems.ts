import { ApiError } from "@/lib/api/client";

/** One row's problem in a refused import, as the refusal's details give it. */
export interface ImportProblem {
  row: number;
  column: string | null;
  message: string;
}

function isProblem(value: unknown): value is ImportProblem {
  if (typeof value !== "object" || value === null) return false;
  const problem = value as Record<string, unknown>;
  return typeof problem.row === "number" && typeof problem.message === "string";
}

/** The rows a refused import names, or none when the refusal was about something else. */
export function importProblems(error: Error): ImportProblem[] {
  if (!(error instanceof ApiError) || error.code !== "import_rows_invalid") return [];
  const rows = error.details.rows;
  return Array.isArray(rows) ? rows.filter(isProblem) : [];
}

/** What the sheet says about one problem: "price: Not a number." */
export function problemText(problem: ImportProblem): string {
  return problem.column ? `${problem.column}: ${problem.message}` : problem.message;
}
