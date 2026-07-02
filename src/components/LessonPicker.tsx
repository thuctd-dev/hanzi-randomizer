'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen, Layers, LayoutGrid, PencilLine,
  ChevronRight, BookMarked, RotateCcw, CheckCircle,
} from 'lucide-react';

export interface Lesson {
  name: string;
  count: number;
}

export type StudyMode = 'flashcard' | 'grid' | 'fill';

interface LessonPickerProps {
  lessons: Lesson[];
  isLoading: boolean;
  onSelect: (lesson: Lesson, mode: StudyMode) => void;
}

const MODES: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
  { id: 'flashcard', label: 'Flashcard', icon: <Layers    className="w-3.5 h-3.5" /> },
  { id: 'fill',      label: 'Điền từ',   icon: <PencilLine className="w-3.5 h-3.5" /> },
  { id: 'grid',      label: 'Bảng từ',   icon: <LayoutGrid className="w-3.5 h-3.5" /> },
];

// Stripe colour cycles per lesson index
const STRIPES = [
  'bg-red-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-blue-400',
  'bg-violet-400',
];
const STRIPE_BARS = [
  'bg-red-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-blue-400',
  'bg-violet-400',
];

// ── localStorage helpers ──────────────────────────────────────────────────
const LS_KEY = 'hanzi_lesson_progress';

export interface LessonProgress {
  seen: number;   // distinct vocab items encountered
  total: number;
  lastMode: StudyMode;
  completedAt?: number; // timestamp ms
}

export function getProgress(lessonName: string): LessonProgress | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const map: Record<string, LessonProgress> = JSON.parse(raw);
    return map[lessonName] ?? null;
  } catch { return null; }
}

export function saveProgress(lessonName: string, p: LessonProgress) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map: Record<string, LessonProgress> = raw ? JSON.parse(raw) : {};
    map[lessonName] = p;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function resetProgress(lessonName: string) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const map: Record<string, LessonProgress> = JSON.parse(raw);
    delete map[lessonName];
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LessonPicker({ lessons, isLoading, onSelect }: LessonPickerProps) {
  // Read progress from localStorage on client side
  const [progMap, setProgMap] = useState<Record<string, LessonProgress>>({});

  useEffect(() => {
    const map: Record<string, LessonProgress> = {};
    for (const l of lessons) {
      const p = getProgress(l.name);
      if (p) map[l.name] = p;
    }
    setProgMap(map);
  }, [lessons]);

  const handleReset = (lessonName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resetProgress(lessonName);
    setProgMap((prev) => {
      const next = { ...prev };
      delete next[lessonName];
      return next;
    });
  };

  if (isLoading || lessons.length === 0) return null;

  const completedCount = lessons.filter((l) => {
    const p = progMap[l.name];
    return p && p.seen >= p.total;
  }).length;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-up">

      {/* ── Heading ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold text-white/80 uppercase tracking-widest mb-4">
          <BookMarked className="w-3.5 h-3.5" />
          {lessons.length} bài học
          {completedCount > 0 && (
            <span className="ml-1 text-emerald-300">· {completedCount} hoàn thành</span>
          )}
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">
          Chọn bài để học
        </h2>
        <p className="text-white/55 text-sm">Bấm vào hình thức học để bắt đầu ngay.</p>
      </div>

      {/* ── 2-column grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lessons.map((lesson, i) => {
          const prog = progMap[lesson.name];
          const seen  = prog?.seen  ?? 0;
          const total = prog?.total ?? lesson.count;
          const pct   = total > 0 ? Math.round((seen / total) * 100) : 0;
          const done  = seen >= total && total > 0;

          return (
            <div
              key={lesson.name}
              className={`group relative bg-white/10 backdrop-blur-md rounded-2xl border shadow-lg
                hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden
                ${done ? 'border-emerald-400/40' : 'border-white/20'}`}
            >
              {/* Coloured top stripe */}
              <div className={`h-0.5 ${STRIPES[i % STRIPES.length]} opacity-70`} />

              <div className="px-4 py-4">

                {/* ── Title row ── */}
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border
                    ${done
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/15 border-white/20 text-white'}`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm leading-tight truncate">
                      {lesson.name}
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5 font-medium">
                      {lesson.count} từ vựng
                    </p>
                  </div>

                  {/* Reset button — only when there's progress */}
                  {prog && (
                    <button
                      onClick={(e) => handleReset(lesson.name, e)}
                      className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-all"
                      title="Học lại từ đầu"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* ── Progress bar ── */}
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-white/40">
                    <span>{done ? '✓ Hoàn thành' : seen > 0 ? `${seen}/${total} từ` : 'Chưa học'}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        done
                          ? 'bg-emerald-400'
                          : STRIPE_BARS[i % STRIPE_BARS.length]
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* ── Mode buttons ── */}
                <div className="flex gap-1.5">
                  {MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onSelect(lesson, mode.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-semibold
                        transition-all bg-white/10 hover:bg-white/25 text-white border border-white/10
                        hover:border-white/30 active:scale-95"
                    >
                      {mode.icon}
                      <span className="truncate">{mode.label}</span>
                      <ChevronRight className="w-3 h-3 opacity-30 shrink-0 hidden sm:block" />
                    </button>
                  ))}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
