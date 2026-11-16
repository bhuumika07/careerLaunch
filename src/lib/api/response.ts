// src/lib/api/response.ts

export const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Returns a Response with strict Cache-Control: private, no-store headers
 * to prevent caching of sensitive or personalized student data across browsers, proxies, and CDNs.
 */
export function personalizedJsonResponse<T>(body: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  for (const [key, val] of Object.entries(NO_CACHE_HEADERS)) {
    headers.set(key, val);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}
