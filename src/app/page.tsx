'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Flashcard from '@/components/Flashcard';
import ImportForm from '@/components/ImportForm';
import GridView, { Vocabulary } from '@/components/GridView';
import FillInGrid from '@/components/FillInGrid';
import LessonPicker, { Lesson, StudyMode, saveProgress, getProgress } from '@/components/LessonPicker';
import TopicPicker, { Topic } from '@/components/TopicPicker';
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
  const [topics, setTopics]                 = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading]   = useState(true);
  const [activeTopic, setActiveTopic]       = useState<string | null>(null);
  const [lessons, setLessons]               = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
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
  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch('/api/topics');
      const json = await res.json();
      setTopics(json.data ?? []);
    } catch (e) { console.error(e); }
    finally { setTopicsLoading(false); }
  }, []);

  useEffect(() => {
    const loadTopics = async () => {
      await fetchTopics();
    };
    void loadTopics();
  }, [fetchTopics]);

  const fetchLessons = useCallback(async (topicName?: string) => {
    setLessonsLoading(true);
    try {
      if (!topicName) {
        setLessons([]);
      } else {
        const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}`);
        const json = await res.json();
        setLessons(json.data ?? []);
        setActiveLesson(null);
        setVocabularies([]);
        setCurrentIndex(0);
      }
    } catch (e) { console.error(e); }
    finally { setLessonsLoading(false); }
  }, []);

  const fetchVocabularies = useCallback(async (topicName?: string, lessonName?: string, excludeRadicals = false) => {
    setVocabLoading(true);
    try {
      const params = new URLSearchParams();
      if (topicName) params.append('topic', topicName);
      if (lessonName) params.append('lesson', lessonName);
      if (excludeRadicals) params.append('excludeRadicals', '1');

      const url = `/api/vocabulary${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
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

  const handleSelectTopic = useCallback((topicName: string) => {
    setActiveTopic(topicName);
    setActiveLesson(null);
    setVocabularies([]);
    setCurrentIndex(0);
    fetchLessons(topicName);
  }, [fetchLessons]);

  const handleBackToTopics = useCallback(() => {
    setActiveTopic(null);
    setActiveLesson(null);
    setLessons([]);
    setVocabularies([]);
    setCurrentIndex(0);
  }, []);

  const handleStartRandomReview = useCallback(async () => {
    setVocabLoading(true);
    try {
      const res  = await fetch('/api/vocabulary?excludeRadicals=1');
      const json = await res.json();
      if (json.data?.length) {
        const pool = [...json.data].sort(() => Math.random() - 0.5).slice(0, 50);
        setVocabularies(pool);
        setCurrentIndex(0);
        setActiveLesson({ name: 'Ôn 50 câu ngẫu nhiên', count: Math.min(50, pool.length) });
        setViewMode('flashcard');
        seenIds.current = new Set();
      }
    } catch (e) { console.error(e); }
    finally { setVocabLoading(false); }
  }, []);

  const handleStartRadicals = useCallback(async () => {
    setVocabLoading(true);
    try {
      const res  = await fetch('/api/vocabulary?lesson=Bộ%20thủ');
      const json = await res.json();
      if (json.data?.length) {
        const pool = [...json.data].sort(() => Math.random() - 0.5);
        setVocabularies(pool);
        setCurrentIndex(0);
        setActiveLesson({ name: 'Bộ thủ', count: pool.length });
        setViewMode('flashcard');
        seenIds.current = new Set();
      }
    } catch (e) { console.error(e); }
    finally { setVocabLoading(false); }
  }, []);

  // ── lesson selection ──────────────────────────────────────
  const handleSelectLesson = (lesson: Lesson, mode: StudyMode) => {
    setActiveLesson(lesson);
    setViewMode(mode);
    seenIds.current = new Set();
    fetchVocabularies(activeTopic ?? undefined, lesson.name);
  };

  const handleBackToLessons = useCallback(() => {
    setActiveLesson(null);
    setViewMode('flashcard');
    setVocabularies([]);
    setCurrentIndex(0);
  }, []);

  const handleDeleteLesson = useCallback(async (lessonName: string) => {
    if (!activeTopic) return;
    setLessonsLoading(true);
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(activeTopic)}?name=${encodeURIComponent(lessonName)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Xóa bài học thất bại');
      }
    } catch (error) {
      console.error(error);
    } finally {
      await fetchLessons(activeTopic);
      if (activeLesson?.name === lessonName) {
        handleBackToLessons();
      }
      setLessonsLoading(false);
    }
  }, [activeLesson, activeTopic, fetchLessons, handleBackToLessons]);

  const handleDeleteTopic = useCallback(async (topicName: string) => {
    setTopicsLoading(true);
    try {
      const res = await fetch(`/api/topics?name=${encodeURIComponent(topicName)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Xóa chủ đề thất bại');
      }
      if (activeTopic === topicName) {
        handleBackToTopics();
      }
      await fetchTopics();
    } catch (error) {
      console.error(error);
    } finally {
      setTopicsLoading(false);
    }
  }, [activeTopic, fetchTopics, handleBackToTopics]);

  const handleImportSuccess = useCallback(async (importedTopic?: string) => {
    await fetchTopics();
    if (importedTopic) {
      setActiveTopic(importedTopic);
      await fetchLessons(importedTopic);
    } else if (activeTopic) {
      await fetchLessons(activeTopic);
    }
    setIsImporting(false);
  }, [activeTopic, fetchLessons, fetchTopics]);

  // ── mark a vocab as seen and persist progress ─────────────
  const markSeen = useCallback((vocabId: string) => {
    if (!activeLesson) return;
    seenIds.current.add(vocabId);
    const existing = getProgress(activeTopic, activeLesson.name);
    const seen = seenIds.current.size;
    const total = vocabularies.length || activeLesson.count;
    saveProgress(activeTopic, activeLesson.name, {
      seen,
      total,
      lastMode: viewMode,
      ...(seen >= total ? { completedAt: Date.now() } : {}),
      // preserve completedAt if already set
      ...(existing?.completedAt && seen < total ? { completedAt: existing.completedAt } : {}),
    });
  }, [activeLesson, activeTopic, vocabularies.length, viewMode]);

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
          className={`absolute inset-0 transition-opacity duration-900 ${fading ? 'opacity-0' : 'opacity-100'}`}
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
          className={`text-white/50 text-[10px] font-medium tracking-widest uppercase transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
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
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-900/55 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex  items-center justify-between gap-3">

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
                  <p className="text-[11px] font-semibold text-red-300 leading-none mt-0.5 truncate max-w-45">
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
        <div className="sm:hidden max-w-4xl mx-auto px-4 pt-3 mt-16">
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
      <div className="max-w-4xl mx-auto px-4 pt-24 py-8">

        {/* Import panel */}
        {isImporting && (
          <div className="mb-8 animate-fade-up">
            <ImportForm onSuccess={(topic) => handleImportSuccess(topic)} topic={activeTopic} />
          </div>
        )}

        {!activeLesson && activeTopic && lessons.length > 0 && (
          <div className="sticky top-16 z-40 mb-4 -mx-4 px-4 py-3 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-3 min-w-max">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Chủ đề: {activeTopic}
              </div>
              <button
                onClick={handleBackToTopics}
                className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs font-semibold transition-all"
              >
                Trở về chủ đề
              </button>
              {lessons.map((lesson) => (
                <button
                  key={lesson.name}
                  onClick={() => handleSelectLesson(lesson, 'flashcard')}
                  className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap"
                >
                  {lesson.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lesson picker (no active lesson) ── */}
        {!activeLesson ? (
          activeTopic ? (
            lessonsLoading ? (
              <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-white/60">
                <Loader2 className="w-8 h-8 animate-spin text-red-400" />
                <p className="text-sm font-medium">Đang tải...</p>
              </div>
            ) : lessons.length > 0 ? (
              <div className="space-y-4 animate-fade-up">
                <div className="rounded-3xl bg-white/10 border border-white/10 p-4 text-white/70">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Ôn lại toàn bộ</h3>
                      <p className="text-[11px] text-white/50 mt-1 max-w-2xl">
                        Chọn để ôn ngẫu nhiên 50 câu từ tất cả các bài học hiện có. Bộ thủ không được tính vào ôn 50 câu này.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleStartRandomReview}
                        className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold rounded-3xl transition-all shadow-lg shadow-red-500/20"
                      >
                        Ôn 50 câu ngẫu nhiên
                      </button>
                      <button
                        onClick={handleStartRadicals}
                        className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-3xl transition-all shadow-lg shadow-blue-500/20"
                      >
                        Học 214 bộ thủ
                      </button>
                    </div>
                  </div>
                </div>
                <LessonPicker
                topic={activeTopic}
                lessons={lessons}
                isLoading={false}
                onSelect={handleSelectLesson}
                onDelete={handleDeleteLesson}
              />
              </div>
            ) : (
              <div className="text-center py-28 max-w-sm mx-auto animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center mx-auto mb-5">
                  <BookOpen className="w-8 h-8 text-white/50" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Chưa có bài học trong chủ đề này</h3>
                <p className="text-white/50 text-sm mb-8 leading-relaxed">
                  Thêm bài học mới hoặc chọn chủ đề khác để bắt đầu học.
                </p>
                <button
                  onClick={handleBackToTopics}
                  className="px-7 py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-500/30 hover:-translate-y-0.5 active:scale-95"
                >
                  Chọn chủ đề khác
                </button>
              </div>
            )
          ) : (
            <div className="space-y-8 animate-fade-up">
              {topicsLoading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-white/60">
                  <Loader2 className="w-8 h-8 animate-spin text-red-400" />
                  <p className="text-sm font-medium">Đang tải chủ đề...</p>
                </div>
              ) : (
                <TopicPicker
                  topics={topics}
                  isLoading={topicsLoading}
                  onSelect={handleSelectTopic}
                  onDelete={handleDeleteTopic}
                />
              )}
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
                      Mỗi hàng ẩn ngẫu nhiên một trường. Nhập bính âm bằng dấu thanh, số hoặc ký tự thay thế `v` cho `ü`. Nhấn Enter để chuyển ô.
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
                    topic={activeTopic}
                    lesson={activeLesson?.name ?? ''}
                    onDataChange={() => fetchVocabularies(activeTopic ?? undefined, activeLesson?.name ?? undefined)}
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
