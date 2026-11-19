import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { placeName } from "./placeName";
import { itemListsKey, type Destination, type Item } from "./useItems";
import type { SettableStatus } from "./useStatusChange";

type ItemsChanged = components["schemas"]["ItemsChanged"];

interface BulkEdit<Input> {
  path: "move" | "tag" | "category" | "status" | "lend" | "delete";
  body: (input: Input) => object;
  message: (count: string, input: Input) => string;
  /** Changes the screen before the answer, returning what puts it back. */
  shown?: (queryClient: QueryClient, ids: string[]) => () => void;
}

interface Call<Input> {
  ids: string[];
  input: Input;
}

function itemCount(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

async function refreshAll(queryClient: QueryClient) {
  // Every list an item can be in, its page and history, and counts; most keys are other features'.
  await Promise.all(
    ["items", "search", "views", "saved-searches", "locations", "history"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

/** One bulk edit: every item selected changed as one step, with Undo and Retry. */
function useBulkEdit<Input>(
  edit: BulkEdit<Input>,
  onDone: () => void,
): (ids: string[], input: Input) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: ({ ids, input }: Call<Input>) =>
      api.post<ItemsChanged>(`/api/items/bulk/${edit.path}`, {
        item_ids: ids,
        ...edit.body(input),
      }),
    onMutate: async ({ ids }) => {
      if (!edit.shown) return undefined;
      await queryClient.cancelQueries({ queryKey: itemListsKey });
      return { putBack: edit.shown(queryClient, ids) };
    },
    onSuccess: (changed, { input }) => {
      onDone();
      showToast({
        message: edit.message(itemCount(changed.items.length), input),
        onUndo: () => undo(changed.history_entry_id),
      });
    },
    onError: (error, call, context) => {
      context?.putBack();
      showToast({ message: error.message, onRetry: () => mutate(call) });
    },
    onSettled: () => refreshAll(queryClient),
  });
  return (ids, input) => mutate({ ids, input });
}

/** Takes moved or deleted items out of the location lists showing them, before the answer. */
function showMoved(queryClient: QueryClient, ids: string[]) {
  const before = queryClient.getQueriesData<Item[]>({ queryKey: itemListsKey });
  queryClient.setQueriesData<Item[]>({ queryKey: itemListsKey }, (items) =>
    items?.filter((item) => !ids.includes(item.id)),
  );
  return () => before.forEach(([key, items]) => queryClient.setQueryData(key, items));
}

const statusWords: Record<SettableStatus, (count: string) => string> = {
  in_place: (count) => `${count} back in place`,
  in_use: (count) => `Marked ${count} in use`,
  sold: (count) => `Marked ${count} sold`,
  given_away: (count) => `Marked ${count} given away`,
  thrown_away: (count) => `Marked ${count} thrown away`,
};

const moving: BulkEdit<Destination> = {
  path: "move",
  body: (place) => ({ location_id: place.id }),
  message: (count, place) => `Moved ${count} to ${placeName(place)}`,
  shown: showMoved,
};

const tagging: BulkEdit<string> = {
  path: "tag",
  body: (tag) => ({ tag }),
  message: (count, tag) => `Tagged ${count} ${tag}`,
};

const categorizing: BulkEdit<string | null> = {
  path: "category",
  body: (category) => ({ category }),
  message: (count, category) =>
    category
      ? `Changed the category of ${count} to ${category}`
      : `Removed the category from ${count}`,
};

const restatusing: BulkEdit<SettableStatus> = {
  path: "status",
  body: (status) => ({ status }),
  message: (count, status) => statusWords[status](count),
};

const lending: BulkEdit<string> = {
  path: "lend",
  body: (lentTo) => ({ lent_to: lentTo }),
  message: (count, lentTo) => `Lent ${count} to ${lentTo}`,
};

const deleting: BulkEdit<null> = {
  path: "delete",
  body: () => ({}),
  message: (count) => `Deleted ${count}`,
  shown: showMoved,
};

/** The bulk edits, each calling onDone once it is stored, so the selection can end. */
export function useBulkEdits(onDone: () => void) {
  return {
    move: useBulkEdit(moving, onDone),
    tag: useBulkEdit(tagging, onDone),
    category: useBulkEdit(categorizing, onDone),
    status: useBulkEdit(restatusing, onDone),
    lend: useBulkEdit(lending, onDone),
    remove: useBulkEdit(deleting, onDone),
  };
}
