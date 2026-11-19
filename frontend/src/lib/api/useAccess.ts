import { useQuery } from "@tanstack/react-query";
import { authStatusQuery } from "./useAuthStatus";

/** What whoever is looking may do: a visitor reads, a viewer also sees private details, and so on. */
export function useAccess() {
  // The frame asks too, outside its error boundary, so a failure is left to the session check.
  const status = useQuery({ ...authStatusQuery, throwOnError: false });
  const account = status.data?.account ?? null;
  const role = account?.role;
  return {
    account,
    canView: account !== null,
    canEdit: role === "editor" || role === "admin",
    isAdmin: role === "admin",
  };
}
