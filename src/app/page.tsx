'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Flashcard from '@/components/Flashcard';
import ImportForm from '@/components/ImportForm';
import GridView, { Vocabulary } from '@/components/GridView';
import FillInGrid from '@/components/FillInGrid';
import LessonPicker, { Lesson, StudyMode, saveProgress, resetProgress, getProgress } from '@/components/LessonPicker';
import {
  BookOpen, Database, Loader2, LayoutGrid, Layers,
  PencilLine, ArrowLeft,
} from 'lucide-react';

// ── Background photo pool ─────────────────────────────────────────────────
const BG_PHOTOS: { src: string; caption: string }[] = [
  { src: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=1920&q=80', caption: 'Vạn Lý Trường Thành' },
  { src: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1920&q=80', caption: 'Sông Lý Giang, Quế Lâm' },
  { src: 'https://images.unsplash.com/photo-1537531023309-66a47e3d6280?w=1920&q=80', caption: 'Thượng Hải về đêm' },
  { src: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=1920&q=80', caption: 'Trương Gia Giới' },
  { src: 'https://images.unsplash.com/photo-1526604922836-5c76b09b1e74?w=1920&q=80', caption: 'Thiên Đàn, Bắc Kinh' },
];

const SLIDE_INTERVAL = 14000; // ms per photo
const FADE_DURATION  = 900;   // ms crossfade

export default function Home() {
  // ── lesson + vocab state ──────────────────────────────────
  const [lessons, setLessons]               = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [activeLesson, setActiveLesson]     = useState<Lesson | null>(null);
  const [viewMode, setViewMode]             = useState<StudyMode>('flashcard');
  const [vocabularies, setVocabularies]     = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [vocabLoading, setVocabLoading]     = useState(false);
  const [isImporting, setIsImporting]       = useState(false);

  // tracks which vocab IDs have been seen in this session
  const seenIds = useRef<Set<string>>(new Set());

  // ── background slideshow ──────────────────────────────────
  // We stack two <Image> layers; the "top" fades out to reveal the "bottom".
  const [current, setCurrent]   = useState(0);          // visible photo index
  const [next,    setNext]      = useState(1);           // preloaded next
  const [fading,  setFading]    = useState(false);       // true during crossfade
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent(n => (n + 1) % BG_PHOTOS.length);
      setNext(n    => (n + 2) % BG_PHOTOS.length);
      setFading(false);
    }, FADE_DURATION);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(advance, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  // Clicking a dot jumps to that photo immediately
  const jumpTo = (idx: number) => {
    if (idx === current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setNext((idx + 1) % BG_PHOTOS.length);
      setFading(false);
      timerRef.current = setInterval(advance, SLIDE_INTERVAL);
    }, FADE_DURATION);
  };

  // ── data fetching ─────────────────────────────────────────
  const fetchLessons = useCallback(async () => {
    setLessonsLoading(true);
    try {
      const res  = await fetch('/api/lessons');
      const json = await res.json();
      setLessons(json.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLessonsLoading(false); }
  }, []);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const fetchVocabularies = useCallback(async (lessonName: string) => {
    setVocabLoading(true);
    try {
      const res  = await fetch(`/api/vocabulary?lesson=${encodeURIComponent(lessonName)}`);
      const json = await res.json();
      if (json.data?.length) {
        setVocabularies([...json.data].sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
      } else {
        setVocabularies([]);
      }
    } catch (e) { console.error(e); }
    finally { setVocabLoading(false); }
  }, []);

  // ── lesson selection ──────────────────────────────────────
  const handleSelectLesson = (lesson: Lesson, mode: StudyMode) => {
    setActiveLesson(lesson);
    setViewMode(mode);
    seenIds.current = new Set();
    fetchVocabularies(lesson.name);
  };

  const handleBackToLessons = () => {
    setActiveLesson(null);
    setVocabularies([]);
    seenIds.current = new Set();
  };

  // ── mark a vocab as seen and persist progress ─────────────
  const markSeen = useCallback((vocabId: string) => {
    if (!activeLesson) return;
    seenIds.current.add(vocabId);
    const existing = getProgress(activeLesson.name);
    const seen = seenIds.current.size;
    const total = vocabularies.length || activeLesson.count;
    saveProgress(activeLesson.name, {
      seen,
      total,
      lastMode: viewMode,
      ...(seen >= total ? { completedAt: Date.now() } : {}),
      // preserve completedAt if already set
      ...(existing?.completedAt && seen < total ? { completedAt: existing.completedAt } : {}),
    });
  }, [activeLesson, vocabularies.length, viewMode]);

  // ── flashcard nav ─────────────────────────────────────────
  const handleNext = () => {
    const cur = vocabularies[currentIndex];
    if (cur) markSeen(cur.id);
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setVocabularies(v => [...v].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
    }
  };
  const handlePrev = () => {
    const cur = vocabularies[currentIndex];
    if (cur) markSeen(cur.id);
    setCurrentIndex(i => (i > 0 ? i - 1 : vocabularies.length - 1));
  };
  const handleShuffle = () => {
    setVocabularies(v => [...v].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  };

  const activeVocab = vocabularies[currentIndex];

  const tabs: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
    { id: 'flashcard', label: 'Flashcard', icon: <Layers     className="w-4 h-4" /> },
    { id: 'fill',      label: 'Điền từ',   icon: <PencilLine className="w-4 h-4" /> },
    { id: 'grid',      label: 'Bảng từ',   icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  // ── render ────────────────────────────────────────────────
  return (
    <main className="min-h-screen selection:bg-red-200/40 selection:text-white pb-24 relative overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════
          BACKGROUND — dual-layer crossfade slideshow
      ═══════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 -z-20" aria-hidden>
        {/* Bottom layer — the NEXT photo (always visible underneath) */}
        <Image
          src={BG_PHOTOS[next].src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          unoptimized
        />
        {/* Top layer — CURRENT photo, fades out to reveal next */}
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: fading ? 0 : 1,
            transitionDuration: `${FADE_DURATION}ms`,
          }}
        >
          <Image
            src={BG_PHOTOS[current].src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            unoptimized
          />
        </div>
      </div>

      {/* Dark scrim */}
      <div className="fixed inset-0 -z-10 bg-slate-900/50" />
      {/* Bottom vignette */}
      <div className="fixed inset-x-0 bottom-0 -z-10 h-56 bg-linear-to-t from-slate-900/70 to-transparent" />
      {/* Top vignette for header legibility */}
      <div className="fixed inset-x-0 top-0 -z-10 h-24 bg-linear-to-b from-slate-900/40 to-transparent" />

      {/* ── Photo caption + dot navigation ─────────────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {/* Caption */}
        <span
          className="text-white/50 text-[10px] font-medium tracking-widest uppercase transition-opacity duration-700"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {BG_PHOTOS[current].caption}
        </span>
        {/* Dots */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {BG_PHOTOS.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-5 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'
              }`}
              aria-label={BG_PHOTOS[i].caption}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-slate-900/55 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between gap-3">

          {/* Left: logo + back */}
          <div className="flex items-center gap-2.5">
            {activeLesson && (
              <button
                onClick={handleBackToLessons}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                title="Danh sách bài"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="bg-red-500 p-2 rounded-xl shadow-lg shadow-red-500/30">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-[17px] text-white tracking-tight leading-none">
                  Hanzi<span className="text-red-400">Random</span>
                </h1>
                {activeLesson ? (
                  <p className="text-[11px] font-semibold text-red-300 leading-none mt-0.5 truncate max-w-[180px]">
                    {activeLesson.name}
                  </p>
                ) : (
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest leading-none mt-0.5">
                    Học tiếng Trung
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center: mode tabs — only when inside a lesson */}
          {activeLesson && (
            <div className="hidden sm:flex bg-white/10 backdrop-blur p-1 rounded-xl gap-0.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${viewMode === tab.id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Right: import toggle */}
          <button
            onClick={() => setIsImporting(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95
              ${isImporting
                ? 'bg-white text-slate-800 shadow-lg'
                : 'bg-white/10 border border-white/15 text-white hover:bg-white/20 backdrop-blur'}`}
          >
            <Database className="w-3.5 h-3.5" />
            {isImporting ? 'Đóng' : 'Nhập dữ liệu'}
          </button>
        </div>
      </header>

      {/* Mobile mode tab bar */}
      {activeLesson && (
        <div className="sm:hidden max-w-4xl mx-auto px-4 pt-3">
          <div className="flex bg-slate-900/50 backdrop-blur-xl p-1 rounded-xl border border-white/10 gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95
                  ${viewMode === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-white/50 hover:text-white'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Import panel */}
        {isImporting && (
          <div className="mb-8 animate-fade-up">
            <ImportForm onSuccess={() => {
              fetchLessons();
              if (activeLesson) fetchVocabularies(activeLesson.name);
              setIsImporting(false);
            }} />
          </div>
        )}

        {/* ── Lesson picker (no active lesson) ── */}
        {!activeLesson ? (
          lessonsLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-sm font-medium">Đang tải...</p>
            </div>
          ) : lessons.length > 0 ? (
            <LessonPicker lessons={lessons} isLoading={false} onSelect={handleSelectLesson} />
          ) : (
            /* Empty state */
            <div className="text-center py-28 max-w-sm mx-auto animate-fade-up">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-8 h-8 text-white/50" />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Chưa có bài học nào</h3>
              <p className="text-white/50 text-sm mb-8 leading-relaxed">
                Nhập từ vựng và đặt tên bài học để bắt đầu học.
              </p>
              <button
                onClick={() => setIsImporting(true)}
                className="px-7 py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-500/30 hover:-translate-y-0.5 active:scale-95"
              >
                Thêm bài đầu tiên
              </button>
            </div>
          )
        ) : (
          /* ── Study area (lesson selected) ── */
          vocabLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-sm font-medium">Đang tải từ vựng...</p>
            </div>
          ) : vocabularies.length > 0 ? (
            <div className="animate-fade-up">

              {/* Flashcard mode */}
              {viewMode === 'flashcard' && activeVocab && (
                <div className="flex justify-center mt-4">
                  <Flashcard
                    key={activeVocab.id}
                    hanzi={activeVocab.hanzi}
                    pinyin={activeVocab.pinyin}
                    meaning={activeVocab.meaning}
                    total={vocabularies.length}
                    index={currentIndex}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onShuffle={handleShuffle}
                  />
                </div>
              )}

              {/* Fill-in mode */}
              {viewMode === 'fill' && (
                <div className="mt-2">
                  <div className="mb-5">
                    <h2 className="text-lg font-extrabold text-white drop-shadow">Điền từ vào chỗ trống</h2>
                    <p className="text-white/50 text-xs mt-1">
                      Mỗi hàng ẩn ngẫu nhiên một trường. Nhấn Enter để chuyển ô.
                    </p>
                  </div>
                  <FillInGrid vocabularies={vocabularies} onMarkSeen={markSeen} />
                </div>
              )}

              {/* Grid / table mode */}
              {viewMode === 'grid' && (
                <div className="mt-2">
                  <div className="mb-5">
                    <h2 className="text-lg font-extrabold text-white drop-shadow">Bảng từ vựng</h2>
                    <p className="text-white/50 text-xs mt-1">
                      Xem, thêm, sửa và xóa từ vựng trực tiếp.
                    </p>
                  </div>
                  <GridView
                    vocabularies={vocabularies}
                    onDataChange={() => fetchVocabularies(activeLesson.name)}
                  />
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-16 text-white/40 text-sm">
              Bài học này chưa có từ vựng nào.
            </div>
          )
        )}
      </div>
    </main>
  );
}
