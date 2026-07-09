'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen, Layers, LayoutGrid, PencilLine,
  ChevronRight, BookMarked, Trash2, CheckCircle,
  Plus, Loader2,
} from 'lucide-react';
import { StudyMode, LessonProgress, getProgress, resetProgress } from '@/lib/progress';

export type { StudyMode, LessonProgress };

export interface Lesson {
  name: string;
  count: number;
}

interface LessonPickerProps {
  lessons: Lesson[];
  isLoading: boolean;
  progressResetKey?: number;
  topic?: string | null;
  onSelect: (lesson: Lesson, mode: StudyMode) => void;
  onDelete: (lessonName: string) => void;
  onAdd: (lessonName: string) => Promise<void>;
}

const MODES: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
  { id: 'flashcard', label: 'Flashcard', icon: <Layers     className="w-3.5 h-3.5" /> },
  { id: 'fill',      label: 'Điền từ',   icon: <PencilLine className="w-3.5 h-3.5" /> },
  { id: 'grid',      label: 'Bảng từ',   icon: <LayoutGrid className="w-3.5 h-3.5" /> },
];

const STRIPES     = ['bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400'];
const STRIPE_BARS = ['bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400'];

function getProgressWidthClass(pct: number) {
  if (pct <= 0)   return 'w-0';
  if (pct < 10)   return 'w-1/12';
  if (pct < 20)   return 'w-1/6';
  if (pct < 30)   return 'w-1/4';
  if (pct < 40)   return 'w-1/3';
  if (pct < 50)   return 'w-5/12';
  if (pct < 60)   return 'w-1/2';
  if (pct < 70)   return 'w-7/12';
  if (pct < 80)   return 'w-2/3';
  if (pct < 90)   return 'w-3/4';
  if (pct < 100)  return 'w-11/12';
  return 'w-full';
}

export default function LessonPicker({ lessons, isLoading, progressResetKey, topic, onSelect, onDelete, onAdd }: LessonPickerProps) {
  const [progMap, setProgMap]   = useState<Record<string, LessonProgress>>({});
  const [newName, setNewName]   = useState('');
  const [adding,  setAdding]    = useState(false);
  const [addError, setAddError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const map: Record<string, LessonProgress> = {};
    for (const l of lessons) {
      const p = getProgress(topic, l.name);
      if (p) map[l.name] = p;
    }
    setProgMap(map);
  }, [lessons, progressResetKey, topic]);

  const handleDelete = (lessonName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(lessonName);
    resetProgress(topic, lessonName);
    setProgMap((prev) => { const next = { ...prev }; delete next[lessonName]; return next; });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true); setAddError('');
    try {
      await onAdd(name);
      setNewName(''); setShowForm(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally { setAdding(false); }
  };

  if (isLoading) return null;

  const completedCount = lessons.filter((l) => {
    const p = progMap[l.name];
    return p && p.seen >= p.total;
  }).length;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold text-white/80 uppercase tracking-widest mb-4">
          <BookMarked className="w-3.5 h-3.5" />
          {lessons.length} bài học
          {completedCount > 0 && <span className="ml-1 text-emerald-300">· {completedCount} hoàn thành</span>}
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">Chọn bài học để học</h2>
        <p className="text-white/55 text-sm">Chọn bài học và hình thức học để bắt đầu ngay.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lessons.map((lesson, i) => {
          const prog  = progMap[lesson.name];
          const seen  = prog?.seen  ?? 0;
          const total = prog?.total ?? lesson.count;
          const pct   = total > 0 ? Math.round((seen / total) * 100) : 0;
          const done  = seen >= total && total > 0;

          return (
            <div key={lesson.name}
              className={`group relative bg-white/10 backdrop-blur-md rounded-2xl border shadow-lg
                hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden
                ${done ? 'border-emerald-400/40' : 'border-white/20'}`}>
              <div className={`h-0.5 ${STRIPES[i % STRIPES.length]} opacity-70`} />
              <div className="px-4 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border
                    ${done ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-white/15 border-white/20 text-white'}`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm leading-tight truncate">{lesson.name}</h3>
                    <p className="text-xs text-white/50 mt-0.5 font-medium">{lesson.count} từ vựng</p>
                  </div>
                  <button onClick={(e) => handleDelete(lesson.name, e)}
                    className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                    title="Xóa bài học">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-white/40">
                    <span>{done ? '✓ Hoàn thành' : seen > 0 ? `${seen}/${total} từ` : 'Chưa học'}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : STRIPE_BARS[i % STRIPE_BARS.length]} ${getProgressWidthClass(pct)}`} />
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {MODES.map((mode) => (
                    <button key={mode.id} onClick={() => onSelect(lesson, mode.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-semibold
                        transition-all bg-white/10 hover:bg-white/25 text-white border border-white/10 hover:border-white/30 active:scale-95">
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

        {showForm ? (
          <form onSubmit={handleAdd}
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-white/60" />
              <span className="text-white/80 text-sm font-semibold">Bài học mới</span>
            </div>
            <input autoFocus type="text" value={newName}
              onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
              placeholder="Tên bài học..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:ring-2 focus:ring-white/30" />
            {addError && <p className="text-red-300 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-40">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tạo bài học
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNewName(''); setAddError(''); }}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-semibold transition-all">
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-dashed border-white/20 hover:border-white/40 shadow-lg px-4 py-5 text-white/50 hover:text-white/80 text-sm font-semibold transition-all">
            <Plus className="w-4 h-4" />Thêm bài học
          </button>
        )}
      </div>
    </div>
  );
}
