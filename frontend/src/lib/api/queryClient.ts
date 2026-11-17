import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

const networkRetries = 2;

function isNetworkFailure(error: unknown): boolean {
  return error instanceof ApiError && error.isNetworkError;
}

/** Makes the one cache of server data the app reads and writes through. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The backend answered, so asking again gives the same answer.
        retry: (failureCount, error) => isNetworkFailure(error) && failureCount < networkRetries,
        throwOnError: (error) => !isNetworkFailure(error),
        refetchOnWindowFocus: true,
      },
    },
  });
}
