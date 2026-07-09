/**
 * Centralised API client.
 * All fetch calls go through here so the base URL is never scattered across components.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function apiUrl(path: string): string {
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

// ── Lesson helpers ────────────────────────────────────────

export interface Lesson {
  id: string;
  name: string;
  order: number;
  wordCount: number;
}

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await apiFetch<{ data: Lesson[] }>('/api/lessons');
  return res.data ?? [];
}

/** Get or create a lesson by name, returns its id */
export async function getOrCreateLesson(name: string, order?: number): Promise<string> {
  // Try to create — if 409 (already exists) fetch the existing one
  const res = await fetch(apiUrl('/api/lessons'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, order: order ?? 0 }),
  });

  if (res.ok) {
    const json = await res.json() as { data: Lesson };
    return json.data.id;
  }

  if (res.status === 409) {
    // Already exists — find it
    const lessons = await fetchLessons();
    const existing = lessons.find((l) => l.name === name);
    if (existing) return existing.id;
  }

  const err = await res.json().catch(() => ({})) as { error?: string };
  throw new Error(err.error ?? 'Không thể tạo bài học');
}
