import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { placeName } from "@/features/items";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { locationTreeKey, type Location } from "./useLocations";

type PhotoChanged = components["schemas"]["LocationPhotoChanged"];

function photoForm(photo: File): FormData {
  const form = new FormData();
  form.append("photo", photo);
  return form;
}

/** Gives a location its photo, or takes it away when given none, with Undo. */
export function useLocationPhoto(location: Location): (photo: File | null) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (photo: File | null) =>
      photo
        ? api.post<PhotoChanged>(`/api/locations/${location.id}/photo`, photoForm(photo))
        : api.delete<PhotoChanged>(`/api/locations/${location.id}/photo`),
    onSuccess: (changed, photo) =>
      showToast({
        message: photo ? `Added a photo to ${placeName(location)}` : "Removed the photo",
        onUndo: () => undo(changed.history_entry_id),
      }),
    onError: (error, photo) => showToast({ message: error.message, onRetry: () => mutate(photo) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: locationTreeKey }),
  });
  return (photo) => mutate(photo);
}
