/**
 * Centralised API client.
 * All fetch calls go through here so the base URL is never scattered across components.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function apiUrl(path: string): string {
  // path must start with '/'
  return `${BASE_URL}${path}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
