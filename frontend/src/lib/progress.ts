/**
 * Progress helpers — localStorage only, called from client-side event handlers.
 * Never import this at module-level in Server Components.
 */

export type StudyMode = 'flashcard' | 'grid' | 'fill' | 'match';

export interface LessonProgress {
  seen: number;
  total: number;
  lastMode: StudyMode;
  completedAt?: number;
}

const LS_KEY = 'hanzi_lesson_progress';

function storageKey(topic: string | null | undefined, lessonName: string) {
  return topic ? `${topic}::${lessonName}` : lessonName;
}

export function getProgress(topic: string | null | undefined, lessonName: string): LessonProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const map: Record<string, LessonProgress> = JSON.parse(raw);
    return map[storageKey(topic, lessonName)] ?? null;
  } catch { return null; }
}

export function saveProgress(topic: string | null | undefined, lessonName: string, p: LessonProgress) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map: Record<string, LessonProgress> = raw ? JSON.parse(raw) : {};
    map[storageKey(topic, lessonName)] = p;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function resetProgress(topic: string | null | undefined, lessonName: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const map: Record<string, LessonProgress> = JSON.parse(raw);
    delete map[storageKey(topic, lessonName)];
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function clearAllProgress() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}
