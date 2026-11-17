import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { placeName } from "./placeName";
import { adding } from "./useAddItem";
import { addingKey, useOptimisticAdd } from "./useOptimisticAdd";
import type { Destination } from "./useItems";

type ItemCreated = components["schemas"]["ItemCreated"];

function photoForm(photo: File, home: Destination | null): FormData {
  const form = new FormData();
  form.append("photo", photo);
  if (home) form.append("home_location_id", home.id);
  return form;
}

/** Adds an item from a photo alone; it shows with the photo at once, and has no name yet. */
export function useAddByPhoto(
  home: Destination | null,
  onSettled: () => void,
): (photo: File) => void {
  const queryClient = useQueryClient();
  const previews = useRef<string[]>([]);
  return useOptimisticAdd({
    home,
    onSettled,
    send: (photo: File) => api.post<ItemCreated>("/api/items/add-by-photo", photoForm(photo, home)),
    shown: (photo) => {
      const preview = URL.createObjectURL(photo);
      previews.current.push(preview);
      return [adding(null, home, preview)];
    },
    told: () => `Added a photo to ${placeName(home)}`,
    // A preview is let go once the list shows the stored photo, after the last add in flight.
    afterwards: () => {
      if (queryClient.isMutating({ mutationKey: addingKey }) > 0) return;
      previews.current.splice(0).forEach((preview) => URL.revokeObjectURL(preview));
    },
  });
}
