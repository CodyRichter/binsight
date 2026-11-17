import { isRouteErrorResponse } from "react-router";
import { ApiError } from "@/lib/api/client";

export interface ErrorSummary {
  kind: "notFound" | "failure";
  title: string;
  summary: string;
  statusLabel: string;
  detail?: string;
}

export function summarizeError(error: unknown, pathname: string): ErrorSummary {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return {
      kind: "notFound",
      title: "Nothing at this address",
      summary: `There is no page at ${pathname}.`,
      statusLabel: "404",
    };
  }
  if (error instanceof ApiError && error.isNotFound) {
    return {
      kind: "notFound",
      title: error.message,
      summary: "Check the code or address and try again.",
      statusLabel: "404",
    };
  }
  if (error instanceof ApiError && error.isNetworkError) {
    return {
      kind: "failure",
      title: "Can't reach Binsight",
      summary: "Check the connection to the home server and try again.",
      statusLabel: "Offline",
    };
  }
  const detail = error instanceof Error ? error.message : undefined;
  const statusLabel = error instanceof ApiError ? `${error.status} ${error.code}` : "500";
  return {
    kind: "failure",
    title: "Something went wrong",
    summary: "The page could not finish loading.",
    statusLabel,
    detail,
  };
}
