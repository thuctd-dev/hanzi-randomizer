'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import Flashcard from '@/components/Flashcard';
import ImportForm from '@/components/ImportForm';
import GridView, { Vocabulary } from '@/components/GridView';
import FillInGrid from '@/components/FillInGrid';
import MatchGame from '@/components/MatchGame';
import { StudyMode, saveProgress, getProgress } from '@/components/LessonPicker';
import { Topic } from '@/components/TopicPicker';
import { apiUrl } from '@/lib/api';
import {
  BookOpen, Database, Loader2, LayoutGrid, Layers,
  PencilLine, ArrowLeft, Plus, X, BookMarked, Trash2, Pencil, Check, Link2, Pin,
} from 'lucide-react';

const BG_PHOTOS: { src: string; caption: string }[] = [
  { src: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=1920&q=80', caption: 'Vạn Lý Trường Thành' },
  { src: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1920&q=80', caption: 'Sông Lý Giang, Quế Lâm' },
  { src: 'https://images.unsplash.com/photo-1537531023309-66a47e3d6280?w=1920&q=80', caption: 'Thượng Hải về đêm' },
  { src: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=1920&q=80', caption: 'Trương Gia Giới' },
  { src: 'https://images.unsplash.com/photo-1526604922836-5c76b09b1e74?w=1920&q=80', caption: 'Thiên Đàn, Bắc Kinh' },
];
const SLIDE_INTERVAL = 14000;
const FADE_DURATION  = 900;

const LESSON_COLORS = [
  'from-red-500/20 to-red-600/10 border-red-400/30 hover:border-red-400/60',
  'from-amber-500/20 to-amber-600/10 border-amber-400/30 hover:border-amber-400/60',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-400/30 hover:border-emerald-400/60',
  'from-blue-500/20 to-blue-600/10 border-blue-400/30 hover:border-blue-400/60',
  'from-violet-500/20 to-violet-600/10 border-violet-400/30 hover:border-violet-400/60',
  'from-pink-500/20 to-pink-600/10 border-pink-400/30 hover:border-pink-400/60',
];
const LESSON_DOTS = ['bg-red-400','bg-amber-400','bg-emerald-400','bg-blue-400','bg-violet-400','bg-pink-400'];

export default function Home() {
  const [topics, setTopics]               = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [activeTopic, setActiveTopic]     = useState<string | null>(null);

  const [lessons, setLessons]               = useState<{ name: string; count: number }[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);

  const [activeLesson, setActiveLesson]   = useState<{ name: string; count: number } | null>(null);
  const [viewMode, setViewMode]           = useState<StudyMode>('flashcard');
  const [vocabularies, setVocabularies]   = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [vocabLoading, setVocabLoading]   = useState(false);
  const [isImporting, setIsImporting]     = useState(false);

  const [editingLesson, setEditingLesson]     = useState<string | null>(null);
  const [editLessonValue, setEditLessonValue] = useState('');

  const [showAddTopic, setShowAddTopic]   = useState(false);
  const [newTopicName, setNewTopicName]   = useState('');
  const [addingTopic, setAddingTopic]     = useState(false);
  const [addTopicError, setAddTopicError] = useState('');

  const [pinnedTopics, setPinnedTopics] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('hanzi_pinned_topics');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const togglePin = useCallback((topicName: string) => {
    setPinnedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicName)) next.delete(topicName); else next.add(topicName);
      try { localStorage.setItem('hanzi_pinned_topics', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const seenIds = useRef<Set<string>>(new Set());

  // ── background slideshow ──────────────────────────────────
  const [current, setCurrent] = useState(0);
  const [next,    setNext]    = useState(1);
  const [fading,  setFading]  = useState(false);
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

  const jumpTo = (idx: number) => {
    if (idx === current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setFading(true);
    setTimeout(() => {
      setCurrent(idx); setNext((idx + 1) % BG_PHOTOS.length); setFading(false);
      timerRef.current = setInterval(advance, SLIDE_INTERVAL);
    }, FADE_DURATION);
  };

  // ── fetchers — dùng apiUrl() thay vì /api/ ───────────────
  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/topics'));
      const json = await res.json();
      setTopics(json.data ?? []);
    } catch (e) { console.error(e); }
    finally { setTopicsLoading(false); }
  }, []);
  useEffect(() => { void fetchTopics(); }, [fetchTopics]);

  const fetchLessons = useCallback(async () => {
    setLessonsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/lessons'));
      const json = await res.json();
      setLessons(json.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLessonsLoading(false); }
  }, []);
  useEffect(() => { void fetchLessons(); }, [fetchLessons]);

  const fetchVocabularies = useCallback(async (lessonName?: string, topicName?: string) => {
    setVocabLoading(true);
    try {
      const params = new URLSearchParams();
      if (lessonName) params.append('lesson', lessonName);
      if (topicName)  params.append('topic', topicName);
      const res = await fetch(apiUrl(`/api/vocabulary?${params.toString()}`));
      const json = await res.json();
      setVocabularies(json.data?.length ? [...json.data].sort(() => Math.random() - 0.5) : []);
      setCurrentIndex(0);
    } catch (e) { console.error(e); }
    finally { setVocabLoading(false); }
  }, []);

  // ── handlers ──────────────────────────────────────────────
  const handleSelectLesson = (lesson: { name: string; count: number }) => {
    setActiveLesson(lesson);
    setViewMode('flashcard');
    seenIds.current = new Set();
    fetchVocabularies(lesson.name, undefined);
  };

  const handleDeleteLesson = useCallback(async (lessonName: string) => {
    try {
      const res = await fetch(apiUrl(`/api/lessons?name=${encodeURIComponent(lessonName)}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      await fetchLessons();
    } catch (e) { console.error(e); }
  }, [fetchLessons]);

  const handleRenameLesson = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    try {
      const res = await fetch(apiUrl('/api/lessons'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Đổi tên thất bại');
      await fetchLessons();
    } catch (e) { console.error(e); }
  }, [fetchLessons]);

  const handleBackToHome = useCallback(() => {
    setActiveLesson(null); setActiveTopic(null);
    setVocabularies([]); setCurrentIndex(0);
  }, []);

  const handleSelectTopic = useCallback((topicName: string) => {
    setActiveTopic(topicName); setActiveLesson(null);
    setVocabularies([]); setCurrentIndex(0);
    fetchVocabularies(undefined, topicName);
  }, [fetchVocabularies]);

  const handleAddTopic = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTopicName.trim();
    if (!name) return;
    setAddingTopic(true); setAddTopicError('');
    try {
      const res = await fetch(apiUrl('/api/topics'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể tạo chủ đề.');
      await fetchTopics(); setNewTopicName(''); setShowAddTopic(false);
    } catch (err: unknown) {
      setAddTopicError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally { setAddingTopic(false); }
  }, [newTopicName, fetchTopics]);

  const handleDeleteTopic = useCallback(async (topicName: string) => {
    try {
      const res = await fetch(apiUrl(`/api/topics?name=${encodeURIComponent(topicName)}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      if (activeTopic === topicName) handleBackToHome();
      await fetchTopics();
    } catch (error) { console.error(error); }
  }, [activeTopic, fetchTopics, handleBackToHome]);

  const handleRandom50 = useCallback(async () => {
    setVocabLoading(true);
    try {
      const res = await fetch(apiUrl('/api/vocabulary?hasLesson=1'));
      const json = await res.json();
      if (json.data?.length) {
        const pool = [...json.data].sort(() => Math.random() - 0.5).slice(0, 50);
        setVocabularies(pool); setCurrentIndex(0);
        setActiveLesson({ name: 'Ôn 50 câu ngẫu nhiên', count: pool.length });
        setViewMode('flashcard'); seenIds.current = new Set();
      }
    } catch (e) { console.error(e); }
    finally { setVocabLoading(false); }
  }, []);

  const handleImportSuccess = useCallback(async () => {
    await fetchLessons(); setIsImporting(false);
  }, [fetchLessons]);

  const markSeen = useCallback((vocabId: string) => {
    if (!activeLesson) return;
    seenIds.current.add(vocabId);
    const existing = getProgress(null, activeLesson.name);
    const seen  = seenIds.current.size;
    const total = vocabularies.length || activeLesson.count;
    saveProgress(null, activeLesson.name, {
      seen, total, lastMode: viewMode,
      ...(seen >= total ? { completedAt: Date.now() } : {}),
      ...(existing?.completedAt && seen < total ? { completedAt: existing.completedAt } : {}),
    });
  }, [activeLesson, vocabularies.length, viewMode]);

  const handleNext = () => {
    const cur = vocabularies[currentIndex]; if (cur) markSeen(cur.id);
    if (currentIndex < vocabularies.length - 1) setCurrentIndex(i => i + 1);
    else { setVocabularies(v => [...v].sort(() => Math.random() - 0.5)); setCurrentIndex(0); }
  };
  const handlePrev = () => {
    const cur = vocabularies[currentIndex]; if (cur) markSeen(cur.id);
    setCurrentIndex(i => (i > 0 ? i - 1 : vocabularies.length - 1));
  };
  const handleShuffle = () => { setVocabularies(v => [...v].sort(() => Math.random() - 0.5)); setCurrentIndex(0); };
  const activeVocab = vocabularies[currentIndex];

  const sortedTopics = useMemo(() => {
    const pinned   = topics.filter(t => pinnedTopics.has(t.name));
    const unpinned = topics.filter(t => !pinnedTopics.has(t.name));
    return [...pinned, ...unpinned];
  }, [topics, pinnedTopics]);

  const tabs: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
    { id: 'flashcard', label: 'Flashcard', icon: <Layers     className="w-4 h-4" /> },
    { id: 'fill',      label: 'Điền từ',   icon: <PencilLine className="w-4 h-4" /> },
    { id: 'match',     label: 'Nối từ',    icon: <Link2      className="w-4 h-4" /> },
    { id: 'grid',      label: 'Bảng từ',   icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const isStudying = !!activeLesson || !!activeTopic;

  return (
    <main className="min-h-screen selection:bg-red-200/40 selection:text-white pb-24 relative overflow-x-hidden">

      {/* Background — bỏ unoptimized, dùng Next.js Image optimization */}
      <div className="fixed inset-0 -z-20" aria-hidden>
        <Image src={BG_PHOTOS[next].src} alt="" fill sizes="100vw" className="object-cover object-center" />
        <div className={`absolute inset-0 transition-opacity duration-900 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          <Image src={BG_PHOTOS[current].src} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        </div>
      </div>
      <div className="fixed inset-0 -z-10 bg-slate-900/50" />
      <div className="fixed inset-x-0 bottom-0 -z-10 h-56 bg-linear-to-t from-slate-900/70 to-transparent" />
      <div className="fixed inset-x-0 top-0 -z-10 h-24 bg-linear-to-b from-slate-900/40 to-transparent" />

      {/* Photo dots */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        <span className={`text-white/50 text-[10px] font-medium tracking-widest uppercase transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          {BG_PHOTOS[current].caption}
        </span>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {BG_PHOTOS.map((_, i) => (
            <button key={i} onClick={() => jumpTo(i)}
              className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'}`}
              aria-label={BG_PHOTOS[i].caption} />
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-900/55 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isStudying && (
              <button
                onClick={() => { viewMode !== 'flashcard' ? setViewMode('flashcard') : handleBackToHome(); }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="bg-red-500 p-1.5 rounded-xl shadow-lg shadow-red-500/30">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-[16px] text-white tracking-tight leading-none">
                  Hanzi<span className="text-red-400">Random</span>
                </h1>
                {activeLesson ? (
                  <p className="text-[11px] font-semibold text-red-300 leading-none mt-0.5 truncate max-w-[180px]">{activeLesson.name}</p>
                ) : activeTopic ? (
                  <p className="text-[11px] font-semibold text-amber-300 leading-none mt-0.5 truncate max-w-[180px]">{activeTopic}</p>
                ) : (
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest leading-none mt-0.5">Học tiếng Trung</p>
                )}
              </div>
            </div>
          </div>

          {isStudying && (
            <div className="hidden sm:flex bg-white/10 backdrop-blur p-1 rounded-xl gap-0.5">
              {tabs.filter(tab => activeLesson || tab.id !== 'grid').map(tab => (
                <button key={tab.id} onClick={() => setViewMode(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${viewMode === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setIsImporting(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95
              ${isImporting ? 'bg-white text-slate-800 shadow-lg' : 'bg-white/10 border border-white/15 text-white hover:bg-white/20 backdrop-blur'}`}>
            <Database className="w-3.5 h-3.5" />
            {isImporting ? 'Đóng' : 'Nhập dữ liệu'}
          </button>
        </div>
      </header>

      {/* ── TOPIC BAR ── */}
      <div className="fixed top-14 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {topicsLoading ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin shrink-0" /> : (
            <>
              {(() => {
                const isActive = activeLesson?.name === 'Bộ thủ';
                return (
                  <button onClick={() => {
                    setActiveLesson({ name: 'Bộ thủ', count: 52 }); setActiveTopic(null);
                    setViewMode('flashcard'); seenIds.current = new Set();
                    fetchVocabularies('Bộ thủ', undefined);
                  }}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap
                      ${isActive ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 hover:text-amber-200 border border-amber-500/30'}`}>
                    <Pin className="w-2.5 h-2.5 shrink-0" />Bộ thủ
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-amber-500/20'}`}>52</span>
                  </button>
                );
              })()}
              <div className="w-px h-4 bg-white/10 shrink-0" />
              {sortedTopics.map((topic) => {
                const isActive = activeTopic === topic.name && !activeLesson;
                const isPinned = pinnedTopics.has(topic.name);
                return (
                  <div key={topic.name} className="group relative shrink-0">
                    <button onClick={() => handleSelectTopic(topic.name)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap
                        ${isActive ? 'bg-red-500 text-white shadow-md shadow-red-500/30' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}>
                      {isPinned && <Pin className={`w-2.5 h-2.5 shrink-0 ${isActive ? 'text-white/70' : 'text-amber-400'}`} />}
                      {topic.name}
                      {(topic as { wordCount?: number }).wordCount != null && (topic as { wordCount?: number }).wordCount! > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                          {(topic as { wordCount?: number }).wordCount}
                        </span>
                      )}
                    </button>
                    <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                      <button onClick={() => togglePin(topic.name)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all shadow
                          ${isPinned ? 'bg-amber-400 text-white' : 'bg-slate-700 hover:bg-amber-400 text-white/60 hover:text-white'}`}
                        title={isPinned ? 'Bỏ ghim' : 'Ghim'}>
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => handleDeleteTopic(topic.name)}
                        className="w-4 h-4 rounded-full bg-slate-700 hover:bg-red-500 text-white/60 hover:text-white flex items-center justify-center transition-all shadow"
                        title="Xóa chủ đề"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  </div>
                );
              })}
              {showAddTopic ? (
                <form onSubmit={handleAddTopic} className="flex items-center gap-1.5 shrink-0">
                  <input autoFocus type="text" value={newTopicName}
                    onChange={(e) => { setNewTopicName(e.target.value); setAddTopicError(''); }}
                    placeholder="Tên chủ đề..."
                    className="h-7 px-3 rounded-full bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-xs outline-none focus:ring-2 focus:ring-white/30 w-36" />
                  {addTopicError && <span className="text-red-300 text-[10px] whitespace-nowrap">{addTopicError}</span>}
                  <button type="submit" disabled={addingTopic || !newTopicName.trim()}
                    className="h-7 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1">
                    {addingTopic ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Tạo
                  </button>
                  <button type="button" onClick={() => { setShowAddTopic(false); setNewTopicName(''); setAddTopicError(''); }}
                    className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <button onClick={() => setShowAddTopic(true)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-dashed border-white/20 hover:border-white/40 text-white/40 hover:text-white/80 text-xs font-semibold transition-all">
                  <Plus className="w-3 h-3" />Thêm chủ đề
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile mode tabs */}
      {isStudying && (
        <div className="sm:hidden fixed top-25 inset-x-0 z-30 px-4 pt-2 pb-2 bg-slate-950/70 backdrop-blur-xl border-b border-white/10">
          <div className="flex bg-white/10 p-1 rounded-xl gap-0.5">
            {tabs.filter(tab => activeLesson || tab.id !== 'grid').map(tab => (
              <button key={tab.id} onClick={() => setViewMode(tab.id)}
                className={`flex-1 flex justify-center items-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95
                  ${viewMode === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-white/50 hover:text-white'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-8">
        {isImporting && (
          <div className="mb-8 animate-fade-up">
            <ImportForm onSuccess={() => handleImportSuccess()} topic={activeTopic} />
          </div>
        )}

        {isStudying ? (
          vocabLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-sm font-medium">Đang tải từ vựng...</p>
            </div>
          ) : vocabularies.length > 0 ? (
            <div className="animate-fade-up">
              {viewMode === 'flashcard' && activeVocab && (
                <div className="flex justify-center mt-4">
                  <Flashcard key={activeVocab.id} hanzi={activeVocab.hanzi} pinyin={activeVocab.pinyin}
                    meaning={activeVocab.meaning} total={vocabularies.length} index={currentIndex}
                    onNext={handleNext} onPrev={handlePrev} onShuffle={handleShuffle} />
                </div>
              )}
              {viewMode === 'fill' && (
                <div className="mt-2">
                  <div className="mb-5">
                    <h2 className="text-lg font-extrabold text-white drop-shadow">Điền từ vào chỗ trống</h2>
                    <p className="text-white/50 text-xs mt-1">Mỗi hàng ẩn ngẫu nhiên một trường. Nhấn Enter để chuyển ô.</p>
                  </div>
                  <FillInGrid vocabularies={vocabularies} onMarkSeen={markSeen} />
                </div>
              )}
              {viewMode === 'match' && (
                <div className="mt-2">
                  <div className="mb-5">
                    <h2 className="text-lg font-extrabold text-white drop-shadow">Nối từ</h2>
                    <p className="text-white/50 text-xs mt-1">Click Hán tự rồi click nghĩa tương ứng để nối cặp.</p>
                  </div>
                  <MatchGame vocabularies={vocabularies} onMarkSeen={markSeen} />
                </div>
              )}
              {viewMode === 'grid' && activeLesson && (
                <div className="mt-2">
                  <div className="mb-5">
                    <h2 className="text-lg font-extrabold text-white drop-shadow">Bảng từ vựng — {activeLesson.name}</h2>
                    <p className="text-white/50 text-xs mt-1">Xem, thêm, sửa và xóa từ vựng trực tiếp.</p>
                  </div>
                  <GridView vocabularies={vocabularies} lesson={activeLesson.name}
                    onDataChange={() => fetchVocabularies(activeLesson.name)} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-white/40 text-sm">Chưa có từ vựng nào.</div>
          )
        ) : (
          <div className="space-y-6 animate-fade-up">
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-sm">Ôn tập ngẫu nhiên</h3>
                <p className="text-white/50 text-xs mt-1">Chọn ngẫu nhiên 50 từ từ tất cả các bài học để ôn luyện.</p>
              </div>
              <button onClick={handleRandom50}
                disabled={vocabLoading || lessonsLoading || lessons.length === 0}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-all shadow-lg shadow-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                {vocabLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Ôn 50 câu ngẫu nhiên
              </button>
            </div>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookMarked className="w-4 h-4 text-white/60" />
                <h2 className="text-base font-extrabold text-white">Bài học</h2>
                {!lessonsLoading && <span className="text-xs text-white/40 font-medium">{lessons.length} bài</span>}
              </div>
              {lessonsLoading ? (
                <div className="flex items-center gap-3 text-white/50 text-sm py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-red-400" />Đang tải bài học...
                </div>
              ) : lessons.length === 0 ? (
                <p className="text-white/30 text-sm">Chưa có bài học nào. Nhập từ vựng và gán tên bài để tạo bài học.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {lessons.map((lesson, i) => (
                    <div key={lesson.name}
                      className={`group relative bg-linear-to-br ${LESSON_COLORS[i % LESSON_COLORS.length]} border backdrop-blur-md rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}>
                      {editingLesson !== lesson.name && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); setEditingLesson(lesson.name); setEditLessonValue(lesson.name); }}
                            className="w-6 h-6 rounded-full bg-black/30 hover:bg-blue-500 text-white/50 hover:text-white flex items-center justify-center transition-all" title="Đổi tên">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); void handleDeleteLesson(lesson.name); }}
                            className="w-6 h-6 rounded-full bg-black/30 hover:bg-red-500 text-white/50 hover:text-white flex items-center justify-center transition-all" title="Xóa bài học">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className={`inline-block w-2 h-2 rounded-full ${LESSON_DOTS[i % LESSON_DOTS.length]} mb-3`} />
                      {editingLesson === lesson.name ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input autoFocus value={editLessonValue} onChange={(e) => setEditLessonValue(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') { await handleRenameLesson(lesson.name, editLessonValue); setEditingLesson(null); }
                              if (e.key === 'Escape') setEditingLesson(null);
                            }}
                            className="flex-1 min-w-0 bg-white/15 border border-white/30 rounded-lg px-2 py-1 text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-white/40" />
                          <button onClick={async () => { await handleRenameLesson(lesson.name, editLessonValue); setEditingLesson(null); }}
                            className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditingLesson(null)}
                            className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleSelectLesson(lesson)} className="w-full text-left active:scale-95 transition-transform">
                          <p className="text-white font-bold text-sm leading-tight truncate">{lesson.name}</p>
                          <p className="text-white/50 text-xs mt-1 font-medium">{lesson.count} từ vựng</p>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
