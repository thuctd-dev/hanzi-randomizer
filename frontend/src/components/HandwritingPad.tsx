'use client';

import {
  useRef, useEffect, useState, useCallback, useMemo,
} from 'react';
import { Trash2, ChevronRight, ChevronLeft, Eye, EyeOff, RotateCcw, CheckCircle, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vocabulary } from '@/components/GridView';
import { useSpeech } from '@/hooks/useSpeech';

interface HandwritingPadProps {
  vocabularies: Vocabulary[];
}

interface Point { x: number; y: number }
interface Stroke { points: Point[]; }

const CANVAS_SIZE = 320; // logical px (square)

export default function HandwritingPad({ vocabularies }: HandwritingPadProps) {
  const [index, setIndex]           = useState(0);
  const [strokes, setStrokes]       = useState<Stroke[]>([]);
  const [currentStroke, setCurrent] = useState<Point[]>([]);
  const [showGuide, setShowGuide]   = useState(true);
  const [checked, setChecked]       = useState(false);
  const [direction, setDirection]   = useState<1 | -1>(1);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);

  const { speak, isSpeaking } = useSpeech({ lang: 'zh-CN', rate: 0.65 });

  // Shuffle on mount
  const shuffled = useMemo(
    () => [...vocabularies].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const vocab = shuffled[index] ?? vocabularies[0];

  // ── reset when card changes ────────────────────────────────
  useEffect(() => {
    setStrokes([]);
    setCurrent([]);
    setChecked(false);
  }, [index]);

  // ── draw on canvas ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Guide character (faint, behind strokes) ──────────────
    if (showGuide) {
      const fontSize = Math.min(CANVAS_SIZE * 0.75, 240);
      ctx.save();
      ctx.font = `900 ${fontSize * dpr}px 'Noto Sans SC', sans-serif`;
      ctx.fillStyle = 'rgba(200,210,230,0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vocab.hanzi, (canvas.width) / 2, (canvas.height) / 2);
      ctx.restore();
    }

    // Grid lines (light)
    ctx.save();
    ctx.strokeStyle = 'rgba(200,210,230,0.3)';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    // vertical centre
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
    // horizontal centre
    ctx.beginPath(); ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();
    ctx.restore();

    // ── User strokes ──────────────────────────────────────────
    const strokeColor = checked ? '#22c55e' : '#1e3a5f';
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 5 * dpr;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash([]);

    const drawStroke = (pts: Point[]) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * dpr, pts[0].y * dpr);
      for (let i = 1; i < pts.length; i++) {
        const mid = {
          x: (pts[i - 1].x + pts[i].x) / 2 * dpr,
          y: (pts[i - 1].y + pts[i].y) / 2 * dpr,
        };
        ctx.quadraticCurveTo(pts[i - 1].x * dpr, pts[i - 1].y * dpr, mid.x, mid.y);
      }
      ctx.stroke();
    };

    strokes.forEach(s => drawStroke(s.points));
    if (currentStroke.length) drawStroke(currentStroke);
    ctx.restore();
  }, [strokes, currentStroke, showGuide, vocab.hanzi, checked]);

  // ── pointer position helpers ───────────────────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    setChecked(false);
    setCurrent([getPos(e)]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    setCurrent(prev => [...prev, getPos(e)]);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setStrokes(prev => currentStroke.length > 1 ? [...prev, { points: currentStroke }] : prev);
    setCurrent([]);
  };

  // ── actions ────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrent([]);
    setChecked(false);
  }, []);

  const handleCheck = useCallback(() => {
    setChecked(true);
    speak(vocab.hanzi);
  }, [vocab.hanzi, speak]);

  const handleUndo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
    setChecked(false);
  }, []);

  const handleNext = useCallback(() => {
    setDirection(1);
    setIndex(i => (i + 1) % shuffled.length);
  }, [shuffled.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setIndex(i => (i > 0 ? i - 1 : shuffled.length - 1));
  }, [shuffled.length]);

  // ── keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') handleClear();
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft')  handlePrev();
      if (e.key === 'Enter') handleCheck();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [handleClear, handleUndo, handleNext, handlePrev, handleCheck]);

  const progress = ((index + 1) / shuffled.length) * 100;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5 animate-fade-up">

      {/* ── Progress ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-white/70">{index + 1} / {shuffled.length}</span>
          <span className="text-white/40 uppercase tracking-wider text-[10px]">Viết chữ Hán</span>
          <span className="text-white/40 text-[10px]">← → chuyển · Enter kiểm tra</span>
        </div>
        <div className="h-1 bg-white/15 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-400 rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Prompt card ─────────────────────────────────────────── */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={vocab.id}
          custom={direction}
          initial={{ opacity: 0, x: direction * 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -50 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-5"
        >
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Hãy viết chữ Hán có nghĩa:</p>
          <p className="text-white text-xl font-bold leading-snug">{vocab.meaning}</p>
          <p className="text-white/60 text-sm mt-1 font-medium">{vocab.pinyin}</p>
        </motion.div>
      </AnimatePresence>

      {/* ── Canvas area ─────────────────────────────────────────── */}
      <div className="relative">
        <div
          className={`rounded-3xl overflow-hidden border-2 transition-colors duration-300 shadow-2xl ${
            checked
              ? 'border-green-400/60 shadow-green-500/10'
              : 'border-white/20 shadow-slate-900/30'
          } bg-white`}
          style={{ aspectRatio: '1 / 1' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
            height={CANVAS_SIZE * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
            style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>

        {/* Guide toggle pill */}
        <button
          onClick={() => setShowGuide(v => !v)}
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur transition-all active:scale-95 border ${
            showGuide
              ? 'bg-blue-500/20 border-blue-400/30 text-blue-200 hover:bg-blue-500/30'
              : 'bg-white/10 border-white/15 text-white/50 hover:bg-white/20'
          }`}
        >
          {showGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showGuide ? 'Ẩn mẫu' : 'Hiện mẫu'}
        </button>

        {/* Checked overlay */}
        {checked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-green-500/30"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hanzi text-base">{vocab.hanzi}</span>
            <span>— {vocab.pinyin}</span>
          </motion.div>
        )}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={strokes.length === 0}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white/60 hover:text-white hover:bg-white/20 disabled:opacity-25 transition-all active:scale-95"
          title="Xóa nét cuối (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={strokes.length === 0 && currentStroke.length === 0}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white/60 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-25 transition-all active:scale-95"
          title="Xóa tất cả (Delete)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Check / reveal */}
        <button
          onClick={handleCheck}
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
            checked
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
              : 'bg-white text-slate-800 hover:bg-slate-50 shadow-lg'
          }`}
        >
          {checked ? (
            <>
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
              Đọc lại
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Kiểm tra · Enter
            </>
          )}
        </button>

        {/* Prev */}
        <button
          onClick={handlePrev}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white/60 hover:text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white/60 hover:text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <p className="text-center text-[10px] text-white/25 uppercase tracking-wider">
        Ctrl+Z = xóa nét · Delete = xóa hết · ← → = chuyển từ
      </p>
    </div>
  );
}
