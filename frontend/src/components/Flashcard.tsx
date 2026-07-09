'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Eye, ChevronRight, ChevronLeft, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';

export type DisplayMode = 'read' | 'listen-write' | 'translate';

interface FlashcardProps {
  hanzi: string;
  pinyin: string;
  meaning: string;
  total: number;
  index: number;
  onNext: () => void;
  onPrev?: () => void;
  onShuffle?: () => void;
}

const MODE_LABELS: Record<DisplayMode, string> = {
  'read':         'Nhìn chữ → Phát âm & Dịch',
  'listen-write': 'Nghe pinyin → Viết chữ',
  'translate':    'Nhìn nghĩa → Viết chữ & pinyin',
};

export default function Flashcard({
  hanzi, pinyin, meaning, total, index, onNext, onPrev, onShuffle,
}: FlashcardProps) {
  const mode: DisplayMode = 'read';
  const [isRevealed, setIsRevealed] = useState(false);
  const [autoRead, setAutoRead]     = useState(true);
  const [slideDir, setSlideDir]     = useState<'left' | 'right' | null>(null);
  const [cardKey, setCardKey]       = useState(0);
  const dragStartX = useRef<number | null>(null);

  const { speak, stop, isSpeaking, isSupported } = useSpeech({ lang: 'zh-CN', rate: 0.65 });

  const hanziSize = useMemo(() => {
    const l = hanzi.length;
    if (l <= 1) return 'text-[5.5rem] leading-none';
    if (l <= 2) return 'text-7xl leading-none';
    if (l <= 4) return 'text-6xl leading-none';
    return 'text-4xl leading-snug';
  }, [hanzi]);

  useEffect(() => {
    stop();
    setTimeout(() => setIsRevealed(false), 0);
  }, [hanzi, pinyin, meaning]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRevealed && autoRead && isSupported) speak(hanzi);
  }, [isRevealed]); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = useCallback(() => { setIsRevealed(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); speak(hanzi); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); return; }
      if (e.key === 'ArrowRight' && isRevealed) { setSlideDir('left');  onNext(); setCardKey(k => k + 1); }
      if (e.key === 'ArrowLeft'  && isRevealed && onPrev) { setSlideDir('right'); onPrev(); setCardKey(k => k + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRevealed, onNext, onPrev, hanzi, reveal]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => { stop(); setSlideDir('left');  setCardKey(k => k + 1); onNext(); }, [onNext, stop]);
  const goPrev = useCallback(() => { stop(); setSlideDir('right'); setCardKey(k => k + 1); onPrev?.(); }, [onPrev, stop]);

  // Touch/drag swipe
  const handlePointerDown = (e: React.PointerEvent) => { dragStartX.current = e.clientX; };
  const handlePointerUp   = (e: React.PointerEvent) => {
    if (!isRevealed || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (dx < -60) goNext();
    else if (dx > 60) goPrev();
  };

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-white/70">{index + 1} / {total}</span>
          <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider text-white/60 max-w-45 truncate">
            {MODE_LABELS[mode]}
          </span>
          {onShuffle && (
            <button onClick={onShuffle}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
              title="Xáo trộn (S)">
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="h-1 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full bg-red-400 rounded-full transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card — CSS animation thay framer-motion */}
      <div
        key={cardKey}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={reveal}
        style={{ animation: slideDir ? `slide-in-${slideDir} 0.22s ease both` : 'fade-up 0.22s ease both' }}
        className={`relative rounded-3xl overflow-hidden select-none
          ${isRevealed
            ? 'cursor-grab active:cursor-grabbing bg-white shadow-2xl border border-slate-100'
            : 'cursor-pointer bg-white shadow-xl border border-slate-100 hover:shadow-2xl active:scale-[0.99]'}
          transition-shadow duration-200`}
      >
        {/* Accent stripe */}
        <div className={`h-1 w-full transition-colors duration-500 ${isRevealed ? 'bg-green-400' : 'bg-red-400'}`} />

        <div className="px-8 py-10 flex flex-col items-center gap-5 min-h-72.5 justify-center">
          <p className={`hanzi font-black text-center ${hanziSize} ${isRevealed && mode !== 'read' ? 'text-green-600' : 'text-slate-900'}`}>
            {hanzi}
          </p>

          {isRevealed && <div className="w-12 h-px bg-slate-200" />}

          {isRevealed ? (
            <>
              <p className={`text-xl font-semibold tracking-wide text-center ${isRevealed ? 'text-green-600' : 'text-slate-600'}`}
                style={{ animation: 'fade-up 0.18s 0.05s ease both', opacity: 0, animationFillMode: 'forwards' }}>
                {pinyin}
              </p>
              <p className={`text-sm text-center leading-relaxed max-w-55 ${isRevealed ? 'text-green-600' : 'text-slate-500'}`}
                style={{ animation: 'fade-up 0.18s 0.1s ease both', opacity: 0, animationFillMode: 'forwards' }}>
                {meaning}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-blue-500 mt-2"
              style={{ animation: 'fade-up 0.3s 0.6s ease both', opacity: 0, animationFillMode: 'forwards' }}>
              <Eye className="w-4 h-4" />
              <span className="text-xs font-semibold">Bấm để xem · Space</span>
            </div>
          )}

          {isSupported && isRevealed && (
            <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}
              style={{ animation: 'fade-up 0.18s 0.2s ease both', opacity: 0, animationFillMode: 'forwards' }}>
              <button onClick={() => { isSpeaking ? stop() : speak(hanzi); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95
                  ${isSpeaking
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200'}`}
                title="Đọc to (R)">
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                <span className="hanzi mr-1">{hanzi}</span>
                <span className="text-xs opacity-70">{isSpeaking ? 'đang đọc...' : 'nghe phát âm'}</span>
              </button>
              <button onClick={() => setAutoRead(v => !v)}
                className={`p-2 rounded-xl transition-all active:scale-95 border
                  ${autoRead
                    ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}
                title={autoRead ? 'Tắt tự động đọc' : 'Bật tự động đọc'}>
                {autoRead ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {isRevealed && (
          <div className="border-t border-slate-100 px-6 py-3 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-300">
            <span>← Trước</span>
            <span className="text-slate-400">vuốt hoặc nút</span>
            <span>Tiếp →</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={goPrev} disabled={!onPrev}
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white/70 hover:text-white hover:bg-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          aria-label="Trước" title="Trước">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isSupported && (
          <button onClick={e => { e.stopPropagation(); isSpeaking ? stop() : speak(hanzi); }}
            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95 border
              ${isSpeaking
                ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30'
                : 'bg-white/15 backdrop-blur border-white/20 text-white/70 hover:bg-white/25 hover:text-white'}`}
            title="Đọc to (R)" aria-label="Đọc to">
            <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </button>
        )}

        <button onClick={goNext} disabled={!isRevealed}
          className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-sm transition-all active:scale-95
            ${isRevealed
              ? 'bg-white text-slate-800 shadow-lg hover:bg-slate-50'
              : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'}`}>
          Từ tiếp theo
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-center text-[10px] text-white/30 font-medium tracking-wider uppercase">
        Space = xem · R = đọc · ← → = chuyển thẻ
      </p>
    </div>
  );
}
