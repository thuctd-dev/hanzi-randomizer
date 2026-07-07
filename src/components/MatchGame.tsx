'use client';

import { useState, useCallback, useMemo } from 'react';
import { RotateCcw, Trophy, Shuffle } from 'lucide-react';
import { Vocabulary } from '@/components/GridView';

interface MatchGameProps {
  vocabularies: Vocabulary[];
  onMarkSeen?: (id: string) => void;
}

interface Card {
  id: string;       // vocab id
  text: string;
  type: 'hanzi' | 'pinyin';
  matched: boolean;
  wrong: boolean;
}

const BATCH = 8;

function buildCards(vocabularies: Vocabulary[]): { left: Card[]; right: Card[] } {
  const pool = [...vocabularies].sort(() => Math.random() - 0.5).slice(0, BATCH);
  const left: Card[]  = pool.map(v => ({ id: v.id, text: v.hanzi,  type: 'hanzi',  matched: false, wrong: false }));
  const right: Card[] = pool.map(v => ({ id: v.id, text: v.pinyin, type: 'pinyin', matched: false, wrong: false }));
  right.sort(() => Math.random() - 0.5);
  return { left, right };
}

export default function MatchGame({ vocabularies, onMarkSeen }: MatchGameProps) {
  const [left,  setLeft]  = useState<Card[]>(() => buildCards(vocabularies).left);
  const [right, setRight] = useState<Card[]>(() => {
    const { right } = buildCards(vocabularies);
    return right;
  });
  const [selectedLeft,  setSelectedLeft]  = useState<string | null>(null); // vocab id
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [wrongPair, setWrongPair]         = useState<[string, string] | null>(null);

  const totalPairs  = left.length;
  const matchedCount = useMemo(() => left.filter(c => c.matched).length, [left]);
  const allDone      = matchedCount === totalPairs;

  const reset = useCallback(() => {
    const { left: l, right: r } = buildCards(vocabularies);
    setLeft(l); setRight(r);
    setSelectedLeft(null); setSelectedRight(null); setWrongPair(null);
  }, [vocabularies]);

  const shuffleRight = useCallback(() => {
    setRight(prev => [...prev].sort(() => Math.random() - 0.5));
    setSelectedLeft(null); setSelectedRight(null);
  }, []);

  // ── handle selection ───────────────────────────────────────
  const handleSelectLeft = (id: string) => {
    const card = left.find(c => c.id === id);
    if (!card || card.matched) return;
    setSelectedLeft(prev => prev === id ? null : id);
    setWrongPair(null);

    // If right already selected → try match
    if (selectedRight) {
      tryMatch(id, selectedRight);
    }
  };

  const handleSelectRight = (id: string) => {
    const card = right.find(c => c.id === id);
    if (!card || card.matched) return;
    setSelectedRight(prev => prev === id ? null : id);
    setWrongPair(null);

    // If left already selected → try match
    if (selectedLeft) {
      tryMatch(selectedLeft, id);
    }
  };

  const tryMatch = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      // ✓ Correct
      setLeft(prev  => prev.map(c => c.id === leftId  ? { ...c, matched: true, wrong: false } : c));
      setRight(prev => prev.map(c => c.id === rightId ? { ...c, matched: true, wrong: false } : c));
      onMarkSeen?.(leftId);
      setSelectedLeft(null); setSelectedRight(null);
    } else {
      // ✗ Wrong — flash red then clear
      setWrongPair([leftId, rightId]);
      setLeft(prev  => prev.map(c => c.id === leftId  ? { ...c, wrong: true } : c));
      setRight(prev => prev.map(c => c.id === rightId ? { ...c, wrong: true } : c));
      setTimeout(() => {
        setLeft(prev  => prev.map(c => ({ ...c, wrong: false })));
        setRight(prev => prev.map(c => ({ ...c, wrong: false })));
        setSelectedLeft(null); setSelectedRight(null);
        setWrongPair(null);
      }, 700);
    }
  };

  const pct = totalPairs > 0 ? Math.round((matchedCount / totalPairs) * 100) : 0;

  return (
    <div className="w-full space-y-4 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-white/70 text-sm font-semibold">
            {matchedCount}/{totalPairs} cặp
          </p>
          {/* progress mini bar */}
          <div className="w-24 h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={shuffleRight}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs font-semibold transition-all active:scale-95">
            <Shuffle className="w-3.5 h-3.5" />Xáo cột phải
          </button>
          <button onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs font-semibold transition-all active:scale-95">
            <RotateCcw className="w-3.5 h-3.5" />Bộ mới
          </button>
        </div>
      </div>

      {/* Done banner */}
      {allDone && (
        <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-5 py-4">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Hoàn thành! Nối đúng tất cả {totalPairs} cặp 🎉</p>
          </div>
          <button onClick={reset}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all active:scale-95">
            Bộ mới
          </button>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left — Hanzi */}
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">Hán tự</p>
          {left.map(card => (
            <button
              key={card.id}
              onClick={() => handleSelectLeft(card.id)}
              disabled={card.matched}
              className={`w-full px-4 py-3 rounded-2xl border text-center font-black text-2xl transition-all duration-150 active:scale-95
                ${card.matched
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 cursor-default opacity-60'
                  : card.wrong
                  ? 'bg-red-500/25 border-red-400/60 text-red-300 scale-95'
                  : selectedLeft === card.id
                  ? 'bg-white/25 border-white/60 text-white shadow-lg scale-[1.02]'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 cursor-pointer'
                }`}
            >
              <span className="hanzi">{card.text}</span>
            </button>
          ))}
        </div>

        {/* Right — Meaning */}
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">Bính âm</p>
          {right.map(card => (
            <button
              key={card.id}
              onClick={() => handleSelectRight(card.id)}
              disabled={card.matched}
              className={`w-full px-3 py-3 rounded-2xl border text-center text-xs font-semibold leading-snug transition-all duration-150 active:scale-95
                ${card.matched
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 cursor-default opacity-60'
                  : card.wrong
                  ? 'bg-red-500/25 border-red-400/60 text-red-300 scale-95'
                  : selectedRight === card.id
                  ? 'bg-white/25 border-white/60 text-white shadow-lg scale-[1.02]'
                  : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:border-white/40 cursor-pointer'
                }`}
            >
              {card.text}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-white/30">
        Click Hán tự rồi click Bính âm tương ứng để nối cặp
      </p>
    </div>
  );
}
