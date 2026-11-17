import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRefreshLocationTree } from "@/features/locations";
import { ApiError, api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

export type Label = components["schemas"]["Label"];
type LabelPage = components["schemas"]["Page_Label_"];
type LabelClaimed = components["schemas"]["LabelClaimed"];
type LabelUnclaimed = components["schemas"]["LabelUnclaimed"];
type BlankLabelsCreated = components["schemas"]["BlankLabelsCreated"];

const labelsKey = ["labels"] as const;
const labelListKey = [...labelsKey, "list"] as const;

function labelKey(code: string) {
  return [...labelsKey, "one", code] as const;
}

function labelPath(code: string): string {
  return `/api/labels/${encodeURIComponent(code)}`;
}

// An unknown code is an answer the page shows, not an error.
async function readLabel(code: string, signal: AbortSignal): Promise<Label | null> {
  try {
    return await api.get<Label>(labelPath(code), signal);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** One label by its code, or null when no label has that code. */
export function useLabel(code: string) {
  return useQuery({
    queryKey: labelKey(code),
    queryFn: ({ signal }) => readLabel(code, signal),
  });
}

/** Every label, newest code first, a page at a time. */
export function useLabelList() {
  return useInfiniteQuery({
    queryKey: labelListKey,
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams(pageParam ? { cursor: pageParam } : {});
      return api.get<LabelPage>(`/api/labels?${query}`, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  });
}

function useRefreshLabels(): (changed?: Label) => void {
  const queryClient = useQueryClient();
  const refreshTree = useRefreshLocationTree();
  return (changed) => {
    if (changed) queryClient.setQueryData(labelKey(changed.code), changed);
    void queryClient.invalidateQueries({ queryKey: labelsKey });
    refreshTree();
  };
}

/** Makes a batch of blank labels; the list shows them once the backend has them. */
export function useMakeBlankLabels(): (count: number) => void {
  const refresh = useRefreshLabels();
  const make = useMutation({
    mutationFn: (count: number) => api.post<BlankLabelsCreated>("/api/labels/blank", { count }),
    onSuccess: () => refresh(),
  });
  const makeNow = (count: number) =>
    make.mutate(count, {
      onError: (error) => showToast({ message: error.message, onRetry: () => makeNow(count) }),
    });
  return makeNow;
}

function useUnclaimLabel(): (code: string) => void {
  const refresh = useRefreshLabels();
  const unclaim = useMutation({
    mutationFn: (code: string) => api.post<LabelUnclaimed>(`${labelPath(code)}/unclaim`),
    onSuccess: refresh,
  });
  const unclaimNow = (code: string) =>
    unclaim.mutate(code, {
      onError: (error) => showToast({ message: error.message, onRetry: () => unclaimNow(code) }),
    });
  return unclaimNow;
}

/** Claims a label for a location, offering Undo, which turns it back into a blank label. */
export function useClaimLabel(): (code: string, location: { id: string; name: string }) => void {
  const refresh = useRefreshLabels();
  const unclaim = useUnclaimLabel();
  const claim = useMutation({
    mutationFn: ({ code, locationId }: { code: string; locationId: string }) =>
      api.post<LabelClaimed>(`${labelPath(code)}/claim`, { location_id: locationId }),
    onSuccess: refresh,
  });
  const claimNow = (code: string, location: { id: string; name: string }) =>
    claim.mutate(
      { code, locationId: location.id },
      {
        onSuccess: () =>
          showToast({
            message: `Claimed ${code} for ${location.name}`,
            onUndo: () => unclaim(code),
          }),
        onError: (error) =>
          showToast({ message: error.message, onRetry: () => claimNow(code, location) }),
      },
    );
  return claimNow;
}
