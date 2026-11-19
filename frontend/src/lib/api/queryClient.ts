import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";
import { authStatusKey, type AuthStatus } from "./useAuthStatus";

const networkRetries = 2;

function isNetworkFailure(error: unknown): boolean {
  return error instanceof ApiError && error.isNetworkError;
}

function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && error.code === "not_signed_in";
}

/** Makes the one cache of server data the app reads and writes through. */
export function createQueryClient(): QueryClient {
  // A session that ended mid-use leaves the page as a visitor sees it, rather than an error.
  const noticeSignOut = (error: unknown) => {
    if (!isSignedOut(error)) return;
    client.setQueryData<AuthStatus>(authStatusKey, { setup_needed: false, account: null });
  };
  const client = new QueryClient({
    queryCache: new QueryCache({ onError: noticeSignOut }),
    mutationCache: new MutationCache({ onError: noticeSignOut }),
    defaultOptions: {
      queries: {
        // The backend answered, so asking again gives the same answer.
        retry: (failureCount, error) => isNetworkFailure(error) && failureCount < networkRetries,
        throwOnError: (error) => !isNetworkFailure(error) && !isSignedOut(error),
      },
    },
  });
  return client;
}
