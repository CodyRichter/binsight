import { MutationObserver, type Query } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";
import { ApiError } from "./client";
import { createQueryClient } from "./queryClient";
import { authStatusKey } from "./useAuthStatus";

/** throwOnError is asked about a query it never reads here. */
function never(): Query {
  return {} as Query;
}

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

const signedOutError = new ApiError(401, "not_signed_in", "Sign in to continue.");

test("a session that ended mid-use marks the device signed out instead of throwing", async () => {
  const client = createQueryClient();
  client.setQueryData(authStatusKey, {
    setup_needed: false,
    account: { id: "sam", username: "sam", role: "admin" },
  });
  await expect(
    client.fetchQuery({ queryKey: ["any"], queryFn: failingWith(signedOutError) }),
  ).rejects.toThrow();
  expect(client.getQueryData(authStatusKey)).toEqual({ setup_needed: false, account: null });
  const throwOnError = client.getDefaultOptions().queries?.throwOnError;
  expect(typeof throwOnError === "function" && throwOnError(signedOutError, never())).toBe(false);
});

test("a write refused because the session ended marks the device signed out", async () => {
  const client = createQueryClient();
  client.setQueryData(authStatusKey, {
    setup_needed: false,
    account: { id: "sam", username: "sam", role: "admin" },
  });
  const write = new MutationObserver(client, { mutationFn: failingWith(signedOutError) });
  await expect(write.mutate()).rejects.toThrow();
  expect(client.getQueryData(authStatusKey)).toEqual({ setup_needed: false, account: null });
});

test("a wrong sign-in leaves the device's status alone", async () => {
  const client = createQueryClient();
  client.setQueryData(authStatusKey, { setup_needed: false, account: null });
  const wrong = new ApiError(
    401,
    "wrong_sign_in",
    "That username or password is wrong. Try again.",
  );
  const write = new MutationObserver(client, { mutationFn: failingWith(wrong) });
  await expect(write.mutate()).rejects.toThrow();
  expect(client.getQueryData(authStatusKey)).toEqual({ setup_needed: false, account: null });
});
