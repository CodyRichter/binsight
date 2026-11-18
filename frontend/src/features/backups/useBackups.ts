import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

export type Backup = components["schemas"]["Backup"];
type BackupList = components["schemas"]["BackupList"];

const backupsKey = ["backups"] as const;

/** The backups kept on the home server, newest first. */
export function useBackups() {
  return useQuery({
    queryKey: backupsKey,
    queryFn: ({ signal }) => api.get<BackupList>("/api/backups", signal),
  });
}

/** Takes a backup now; the new row in the list is the confirmation. */
export function useBackUpNow(): () => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => api.post<Backup>("/api/backups"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: backupsKey }),
    onError: (error) => showToast({ message: error.message, onRetry: () => mutate() }),
  });
  return () => mutate();
}
