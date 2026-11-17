interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

function normalizePath(path: string): string {
  if (path !== "/" && path.endsWith("/")) {
    throw new Error(`API paths must not end with a trailing slash: ${path}`);
  }
  return path;
}

async function readErrorPayload(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  const payload = await readErrorPayload(response);
  const error = payload?.error;
  return new ApiError(
    response.status,
    error?.code ?? "request_failed",
    error?.message ?? "Something went wrong.",
    error?.details ?? {},
  );
}

function buildInit(options: ApiRequestOptions): RequestInit {
  const { method = "GET", body, signal } = options;
  const headers = new Headers();
  let encodedBody: string | FormData | undefined;
  // The browser sets a form's content type itself, with the boundary between its parts.
  if (body instanceof FormData) {
    encodedBody = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    encodedBody = JSON.stringify(body);
  }
  return { method, headers, body: encodedBody, credentials: "same-origin", signal };
}

// Binsight never sends these itself; they come from a proxy in front of it that got no answer.
const gatewayStatuses = new Set([502, 503, 504]);

function unreachable(cause: unknown): ApiError {
  return new ApiError(0, "network_error", "Can't reach Binsight.", { cause });
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const target = normalizePath(path);
  let response: Response;
  try {
    response = await fetch(target, buildInit(options));
  } catch (error) {
    throw unreachable(error);
  }
  if (gatewayStatuses.has(response.status)) throw unreachable(response.statusText);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "POST", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "DELETE", signal }),
};
