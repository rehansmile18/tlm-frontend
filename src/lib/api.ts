import { normalizeBaseUrl, request, type RequestOptions } from "./api-core";

// Re-exported so call sites keep importing everything api-shaped from one module.
export { ApiError, normalizeBaseUrl } from "./api-core";
export type { QueryValue, RequestOptions } from "./api-core";

// This app talks to a single backend: TLM (`~/Git/TLM`), the rule repository and auth authority.
export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
);

/** Single fetch entrypoint for the whole app. */
export function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return request<T>(API_BASE_URL, path, opts);
}
