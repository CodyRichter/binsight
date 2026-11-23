import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
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

/**
 * Sends a location's label to the printer. While it is on its way `printing` is true; once printed,
 * `onPrinted` runs and a toast confirms it, because the printer is usually somewhere else.
 */
export function usePrintLabel(code: string, onPrinted: () => void = () => undefined) {
  const sending = useRef(false);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post<PrintedLabel>(`/api/labels/${encodeURIComponent(code)}/print`),
    onSettled: () => {
      sending.current = false;
    },
    onSuccess: () => {
      onPrinted();
      showToast({ message: `Printed ${code}`, onPrintAgain: print });
    },
    onError: (error) => showToast({ message: error.message, onRetry: print }),
  });
  function print() {
    // One label per press: a second tap, or a toast action, while one is on its way does nothing.
    if (sending.current) return;
    sending.current = true;
    mutate();
  }
  return { print, printing: isPending };
}
