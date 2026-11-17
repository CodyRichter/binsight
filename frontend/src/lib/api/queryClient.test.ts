import { expect, test, vi } from "vitest";
import { ApiError } from "./client";
import { createQueryClient } from "./queryClient";

function failingWith(error: ApiError) {
  return vi.fn(() => Promise.reject(error));
}

test("a network failure is asked again twice", async () => {
  const ask = failingWith(new ApiError(0, "network_error", "Can't reach Binsight."));
  await expect(
    createQueryClient().fetchQuery({ queryKey: ["any"], queryFn: ask, retryDelay: 0 }),
  ).rejects.toThrow("Can't reach Binsight.");
  expect(ask).toHaveBeenCalledTimes(3);
});

test("a refusal from the backend is not asked again", async () => {
  const ask = failingWith(new ApiError(404, "location_not_found", "No such location."));
  await expect(
    createQueryClient().fetchQuery({ queryKey: ["any"], queryFn: ask, retryDelay: 0 }),
  ).rejects.toThrow("No such location.");
  expect(ask).toHaveBeenCalledTimes(1);
});
