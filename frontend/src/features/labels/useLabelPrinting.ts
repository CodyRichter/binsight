import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

type PrintAddress = components["schemas"]["PrintAddress"];
type PrintedLabel = components["schemas"]["PrintedLabel"];

const printAddressKey = ["labels", "print-address"] as const;

/** Where Direct Print sends labels; null until an admin sets up a printer. Asked only when `needed`. */
export function usePrintAddress(needed = true) {
  return useQuery({
    queryKey: printAddressKey,
    enabled: needed,
    queryFn: ({ signal }) => api.get<PrintAddress>("/api/labels/print-address", signal),
  });
}

/** Saves the print address; an empty value clears it. */
export function useSetPrintAddress(): (typed: string) => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (typed: string) =>
      api.patch<PrintAddress>("/api/labels/print-address", { print_address: typed || null }),
    onSuccess: (saved) => queryClient.setQueryData(printAddressKey, saved),
    onError: (error, typed) => showToast({ message: error.message, onRetry: () => mutate(typed) }),
  });
  return mutate;
}

/** Sends a location's label to the printer; the label coming out is the confirmation. */
export function usePrintLabel(code: string) {
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post<PrintedLabel>(`/api/labels/${encodeURIComponent(code)}/print`),
    onError: (error) => showToast({ message: error.message, onRetry: () => mutate() }),
  });
  return { print: () => mutate(), printing: isPending };
}
