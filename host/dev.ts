/**
 * The host page's side of the private development game (cloud/src/dev.ts): the owner's session is a cookie this page
 * carries on its own origin (the Worker's), so every call here is same-origin with the `x-realm-dev` header the Worker
 * asks for on writes. Nothing here is in the public host page: host/editor.tsx and this are built only with --dev-tools.
 */
import type { Overlay } from "../games/rarefriends-realm/overlay.ts";

export type Revision = { id: number; version: number; name: string | null; note: string | null; size: number; at: number };
const api = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`/dev/api${path}`, { method, headers: { "x-realm-dev": "1", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status === 401) { location.reload(); throw new Error("signed out"); }
  if (!response.ok) throw new Error(String(data.error ?? `status ${response.status}`));
  return data;
};
export const devApi = {
  me: () => api("GET", "/me") as Promise<{ ok: boolean; expiresAt: number }>,
  logout: () => api("POST", "/logout"),
  logoutAll: () => api("POST", "/logout-all"),
  load: (world: string) => api("GET", `/world/${world}`) as Promise<{ overlay: Overlay; version: number; updatedAt: number | null; revisions: number }>,
  save: (world: string, baseVersion: number, overlay: Overlay, note?: string) => api("PUT", `/world/${world}`, { baseVersion, overlay, note }) as Promise<{ version: number; updatedAt: number }>,
  revisions: (world: string) => api("GET", `/world/${world}/revisions`) as Promise<{ revisions: Revision[] }>,
  checkpoint: (world: string, name: string) => api("POST", `/world/${world}/revisions`, { name }) as Promise<{ ok: boolean; name: string }>,
  restore: (world: string, revision: number) => api("POST", `/world/${world}/restore`, { revision }) as Promise<{ version: number; overlay: Overlay }>,
  reset: (world: string) => api("POST", `/world/${world}/reset`) as Promise<{ version: number; overlay: Overlay }>,
  audit: () => api("GET", "/audit") as Promise<{ audit: { at: number; action: string; detail: string }[] }>,
  exportUrl: (world: string) => `/dev/api/world/${world}/export`,
};
