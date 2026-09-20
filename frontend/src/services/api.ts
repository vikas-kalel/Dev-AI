const API_BASE = "/api/v1";

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url =
    endpoint.startsWith("http") || endpoint.startsWith("/api")
      ? endpoint
      : `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Retrieve token from localStorage as fallback if cookies aren't shared
  const token = localStorage.getItem("devai_auth_token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Ensure session cookies are sent
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { error: { message: response.statusText } };
  }

  if (!response.ok) {
    const errObj = data.error || {};
    const code =
      errObj.code ||
      (response.status === 401
        ? "UNAUTHORIZED"
        : response.status === 403
          ? "FORBIDDEN"
          : "API_ERROR");
    const message =
      errObj.message ||
      data.error ||
      data.message ||
      "An unexpected error occurred.";
    throw new ApiError(code, message, response.status, errObj.details);
  }

  return data as T;
}
