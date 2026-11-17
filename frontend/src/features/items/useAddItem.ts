import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemListKey, itemListsKey, type Item } from "./useItems";

type NewItem = components["schemas"]["NewItem"];
type ItemCreated = components["schemas"]["ItemCreated"];

const addingKey = ["items", "add"] as const;

interface Home {
  id: string;
  path: Item["path"];
}

function adding(name: string, home: Home): Item {
  return {
    id: `adding-${crypto.randomUUID()}`,
    name,
    quantity: 1,
    home_location_id: home.id,
    path: home.path,
    created_at: new Date().toISOString(),
  };
}

/** Adds an item by name to a location: it shows at once and is taken back if refused. */
export function useAddItem(home: Home, onSettled: () => void): (name: string) => void {
  const queryClient = useQueryClient();
  const lists = [itemListKey(home.id, false), itemListKey(home.id, true)];
  const create = useMutation({
    mutationKey: addingKey,
    mutationFn: (name: string) =>
      api.post<ItemCreated>("/api/items", { name, home_location_id: home.id } satisfies NewItem),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: itemListsKey });
      const shown = adding(name, home);
      for (const key of lists) {
        queryClient.setQueryData<Item[]>(key, (items) => items && [...items, shown]);
      }
      return shown;
    },
    onError: (_error, _name, shown) => {
      for (const key of lists) {
        queryClient.setQueryData<Item[]>(key, (items) =>
          items?.filter((item) => item.id !== shown?.id),
        );
      }
    },
    onSettled: () => {
      // Reading the list while another add is on its way would drop that one from the screen.
      if (queryClient.isMutating({ mutationKey: addingKey }) > 1) return;
      void queryClient.invalidateQueries({ queryKey: itemListsKey });
      onSettled();
    },
  });
  const add = (name: string) =>
    create.mutate(name, {
      onError: (error) => showToast({ message: error.message, onRetry: () => add(name) }),
    });
  return add;
}
