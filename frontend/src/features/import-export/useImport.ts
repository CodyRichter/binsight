import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { importProblems, type ImportProblem } from "./importProblems";

type ImportDone = components["schemas"]["ImportDone"];

function told(done: ImportDone): string {
  const items = done.items_created === 1 ? "1 item" : `${done.items_created} items`;
  if (done.locations_created === 0) return `Imported ${items}`;
  const places =
    done.locations_created === 1 ? "1 new location" : `${done.locations_created} new locations`;
  return `Imported ${items} into ${places}`;
}

/** Imports items from a CSV file with Undo; rows that can't be imported go to onProblems. */
export function useImport(onProblems: (problems: ImportProblem[]) => void): (file: File) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("csv", file);
      return api.post<ImportDone>("/api/import", form);
    },
    onSuccess: (done) =>
      showToast({ message: told(done), onUndo: () => undo(done.history_entry_id) }),
    onError: (error, file) => {
      const problems = importProblems(error);
      if (problems.length > 0) onProblems(problems);
      else showToast({ message: error.message, onRetry: () => mutate(file) });
    },
    // An import can add to any location, list or view, so whatever is showing is read again.
    onSettled: () => void queryClient.invalidateQueries(),
  });
  return (file) => mutate(file);
}
