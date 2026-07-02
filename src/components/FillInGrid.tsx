'use client';

import { useState, useMemo, useCallback, useRef, forwardRef } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Trophy, Send, Check } from 'lucide-react';
import { Vocabulary } from '@/components/GridView';

type HiddenField = 'hanzi' | 'pinyin' | 'meaning';

interface RowState {
  vocab: Vocabulary;
  hidden: HiddenField;
  input: string;
  status: 'idle' | 'correct' | 'wrong';
  showAnswer: boolean;
}

interface FillInGridProps {
  vocabularies: Vocabulary[];
  onMarkSeen?: (id: string) => void;
}

const BATCH = 10;

function buildRows(vocabularies: Vocabulary[]): RowState[] {
  const shuffled = [...vocabularies].sort(() => Math.random() - 0.5);
  const fields: HiddenField[] = ['hanzi', 'pinyin', 'meaning'];
  return shuffled.slice(0, BATCH).map((vocab) => ({
    vocab,
    hidden: fields[Math.floor(Math.random() * fields.length)],
    input: '',
    status: 'idle',
    showAnswer: false,
  }));
}

// ── Pinyin normalisation ──────────────────────────────────────────────────
// Maps tone-marked vowels → base vowel + tone number (e.g. ā→a1, á→a2…)

const TONE_MAP: Record<string, string> = {
  'ā':'a1','á':'a2','ǎ':'a3','à':'a4',
  'ē':'e1','é':'e2','ě':'e3','è':'e4',
  'ī':'i1','í':'i2','ǐ':'i3','ì':'i4',
  'ō':'o1','ó':'o2','ǒ':'o3','ò':'o4',
  'ū':'u1','ú':'u2','ǔ':'u3','ù':'u4',
  'ǖ':'v1','ǘ':'v2','ǚ':'v3','ǜ':'v4',
  'ü':'v',
};

/**
 * Converts pinyin with tone marks OR tone numbers into a canonical
 * "base+number" form for comparison.
 *
 * nǐ hǎo  → ni3 hao3
 * ni3 hao3 → ni3 hao3
 * ni hao   → ni hao
 */
function normalisePinyin(s: string): string {
  let result = s.toLowerCase().trim();
  for (const [marked, plain] of Object.entries(TONE_MAP)) {
    // replaceAll with a string literal — safe and no regex escaping needed
    result = result.split(marked).join(plain);
  }
  return result.replace(/\s+/g, ' ');
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pinyinMatch(input: string, answer: string): boolean {
  if (normalise(input) === normalise(answer)) return true;
  if (normalisePinyin(input) === normalisePinyin(answer)) return true;
  // lenient: ignore tone numbers entirely
  const bare = (s: string) =>
    normalisePinyin(s).replace(/[1-5]/g, '').replace(/\s+/g, ' ').trim();
  return bare(input) === bare(answer);
}

/**
 * Split a meaning string into individual candidate tokens.
 * Splits on commas, semicolons, slashes, and parenthesised groups.
 * e.g. "bạn, anh, chị (đại từ ngôi thứ 2)" → ["bạn", "anh", "chị"]
 */
function splitMeaning(s: string): string[] {
  // Remove parenthesised notes first
  const stripped = s.replace(/\(.*?\)/g, '');
  return stripped
    .split(/[,;/／、]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function checkAnswer(input: string, answer: string, field: HiddenField): boolean {
  if (field === 'pinyin') return pinyinMatch(input, answer);
  if (field === 'meaning') {
    const norm = normalise(input);
    // Accept exact full match
    if (norm === normalise(answer)) return true;
    // Accept any single token from the answer
    return splitMeaning(answer).some((token) => normalise(token) === norm);
  }
  return normalise(input) === normalise(answer);
}

const FIELD_LABELS: Record<HiddenField, string> = {
  hanzi:   'Hán tự',
  pinyin:  'Bính âm',
  meaning: 'Nghĩa',
};

export default function FillInGrid({ vocabularies, onMarkSeen }: FillInGridProps) {
  const [rows, setRows]           = useState<RowState[]>(() => buildRows(vocabularies));
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const score    = useMemo(() => rows.filter((r) => r.status === 'correct').length, [rows]);
  const allDone  = rows.every((r) => r.status !== 'idle');
  const allFilled = rows.every((r) => r.input.trim() !== '');
  const pct      = allDone ? Math.round((score / rows.length) * 100) : 0;

  // ── update a single row's input ───────────────────────────────────────
  const handleInput = useCallback((idx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        // If user edits a row that was already checked, reset it to idle
        return { ...r, input: value, status: r.status !== 'idle' ? 'idle' : 'idle' };
      })
    );
  }, []);

  // ── check a single row immediately ────────────────────────────────────
  const checkRow = useCallback((idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx || r.input.trim() === '') return r;
        const correct = checkAnswer(r.input, r.vocab[r.hidden], r.hidden);
        if (correct) onMarkSeen?.(r.vocab.id);
        return { ...r, status: correct ? 'correct' : 'wrong' };
      })
    );
  }, [onMarkSeen]);

  // ── Enter: check current row, then advance to next empty ─────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      // Check this row first
      setRows((prev) =>
        prev.map((r, i) => {
          if (i !== idx || r.input.trim() === '') return r;
          const correct = checkAnswer(r.input, r.vocab[r.hidden], r.hidden);
          if (correct) onMarkSeen?.(r.vocab.id);
          return { ...r, status: correct ? 'correct' : 'wrong' };
        })
      );

      // Move to next unfilled input
      const nextIdx = inputRefs.current.findIndex(
        (el, i) => i > idx && el !== null
      );
      if (nextIdx !== -1) {
        inputRefs.current[nextIdx]?.focus();
      }
    },
    [onMarkSeen]
  );

  // ── check all remaining rows ──────────────────────────────────────────
  const handleCheckAll = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => {
        const correct = r.input.trim()
          ? checkAnswer(r.input, r.vocab[r.hidden], r.hidden)
          : false;
        if (correct) onMarkSeen?.(r.vocab.id);
        return { ...r, status: correct ? 'correct' : 'wrong' };
      })
    );
    setSubmitted(true);
  }, [onMarkSeen]);

  const handleReset = useCallback(() => {
    setRows(buildRows(vocabularies));
    setSubmitted(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }, [vocabularies]);

  const toggleAnswer = useCallback((idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, showAnswer: !r.showAnswer } : r))
    );
  }, []);

  const scoreColor =
    pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';

  const checkedCount = rows.filter((r) => r.status !== 'idle').length;

  return (
    <div className="w-full space-y-4 animate-fade-up">

      {/* ── Score banner (shows after all checked) ── */}
      {allDone && (
        <div className={`flex items-center justify-between bg-white rounded-2xl border px-5 py-4 shadow-sm
          ${pct >= 80 ? 'border-green-200' : pct >= 50 ? 'border-amber-200' : 'border-red-200'}`}
        >
          <div className="flex items-center gap-3">
            <Trophy className={`w-5 h-5 ${pct >= 80 ? 'text-amber-400' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs text-slate-400 font-medium">Kết quả</p>
              <p className="font-extrabold text-slate-800 leading-none">
                {score}/{rows.length}{' '}
                <span className={`text-base font-bold ${scoreColor}`}>({pct}%)</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Bộ mới
          </button>
        </div>
      )}

      {/* ── Pinyin hint ── */}
      {rows.some((r) => r.hidden === 'pinyin' && r.status === 'idle') && (
        <p className="text-[11px] text-white/40 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 leading-relaxed">
          💡 <span className="font-semibold text-white/55">Bính âm:</span>{' '}
          nhập dấu thanh hoặc số đều được —{' '}
          <span className="font-mono text-white/50">nǐ hǎo</span>{' = '}
          <span className="font-mono text-white/50">ni3 hao3</span>{' = '}
          <span className="font-mono text-white/50">ni hao</span>
        </p>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-8 text-center">#</th>
                <th className="py-3 px-4 w-[22%]">Hán tự</th>
                <th className="py-3 px-4 w-[22%]">Bính âm</th>
                <th className="py-3 px-4">Nghĩa</th>
                <th className="py-3 px-4 w-10 text-center">✓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const isH = row.hidden === 'hanzi';
                const isP = row.hidden === 'pinyin';
                const isM = row.hidden === 'meaning';

                const rowBg =
                  row.status === 'correct' ? 'bg-green-50/50' :
                  row.status === 'wrong'   ? 'bg-red-50/40'   :
                  'hover:bg-slate-50/70';

                return (
                  <tr key={row.vocab.id} className={`transition-colors ${rowBg}`}>
                    <td className="py-3 px-4 text-center text-slate-300 font-semibold text-xs">
                      {idx + 1}
                    </td>

                    {/* Hanzi */}
                    <td className="py-2.5 px-3">
                      {isH ? (
                        <Cell
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          value={row.input}
                          onChange={(v) => handleInput(idx, v)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          status={row.status}
                          answer={row.vocab.hanzi}
                          showAnswer={row.showAnswer}
                          onToggleAnswer={() => toggleAnswer(idx)}
                          placeholder={`Viết ${FIELD_LABELS.hanzi}…`}
                          isHanzi
                        />
                      ) : (
                        <span className="hanzi text-xl font-bold text-slate-800">{row.vocab.hanzi}</span>
                      )}
                    </td>

                    {/* Pinyin */}
                    <td className="py-2.5 px-3">
                      {isP ? (
                        <Cell
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          value={row.input}
                          onChange={(v) => handleInput(idx, v)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          status={row.status}
                          answer={row.vocab.pinyin}
                          showAnswer={row.showAnswer}
                          onToggleAnswer={() => toggleAnswer(idx)}
                          placeholder="nǐ hǎo  hoặc  ni3 hao3"
                          isPinyin
                        />
                      ) : (
                        <span className="text-slate-600 font-medium">{row.vocab.pinyin}</span>
                      )}
                    </td>

                    {/* Meaning */}
                    <td className="py-2.5 px-3">
                      {isM ? (
                        <Cell
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          value={row.input}
                          onChange={(v) => handleInput(idx, v)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          status={row.status}
                          answer={row.vocab.meaning}
                          showAnswer={row.showAnswer}
                          onToggleAnswer={() => toggleAnswer(idx)}
                          placeholder={`Viết ${FIELD_LABELS.meaning}…`}
                        />
                      ) : (
                        <span className="text-slate-500 text-xs leading-snug">{row.vocab.meaning}</span>
                      )}
                    </td>

                    {/* Per-row check button / status icon */}
                    <td className="py-2.5 px-3 text-center">
                      {row.status === 'correct' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      )}
                      {row.status === 'wrong' && (
                        <button
                          type="button"
                          onClick={() => checkRow(idx)}
                          title="Kiểm tra lại"
                          className="mx-auto flex items-center justify-center w-6 h-6 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 transition-colors active:scale-95"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {row.status === 'idle' && (
                        <button
                          type="button"
                          onClick={() => checkRow(idx)}
                          disabled={row.input.trim() === ''}
                          title="Kiểm tra hàng này"
                          className={`mx-auto flex items-center justify-center w-6 h-6 rounded-lg transition-all active:scale-95
                            ${row.input.trim()
                              ? 'bg-blue-100 hover:bg-blue-200 text-blue-600 cursor-pointer'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action row ── */}
      {!allDone ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-white/40 font-medium shrink-0">
            {checkedCount}/{rows.length} đã kiểm tra · Nhấn ✓ để check từng hàng hoặc Enter để chuyển ô
          </p>
          <button
            onClick={handleCheckAll}
            disabled={!allFilled}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shrink-0
              ${allFilled
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            <Send className="w-4 h-4" />
            Kiểm tra tất cả
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Bộ câu hỏi mới
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cell sub-component ────────────────────────────────────────────────────

interface CellProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  status: 'idle' | 'correct' | 'wrong';
  answer: string;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  placeholder: string;
  isHanzi?: boolean;
  isPinyin?: boolean;
}

const Cell = forwardRef<HTMLInputElement, CellProps>(function Cell(
  {
    value, onChange, onKeyDown,
    status, answer, showAnswer, onToggleAnswer,
    placeholder, isHanzi, isPinyin,
  },
  ref,
) {
  const isChecked = status !== 'idle';

  const borderClass = isChecked
    ? status === 'correct'
      ? 'border-green-400 bg-green-50 text-green-700'
      : 'border-red-300 bg-red-50 text-red-600'
    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20';

  const normAnswer = isPinyin ? normalisePinyin(answer) : null;

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={`w-full px-3 py-2 rounded-xl border outline-none transition-all text-sm
          ${isHanzi  ? 'hanzi text-lg font-bold' : 'font-medium'}
          ${isPinyin ? 'font-mono' : ''}
          ${borderClass}`}
      />
      {isChecked && status === 'wrong' && (
        <button
          type="button"
          onClick={onToggleAnswer}
          className="text-left text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors"
        >
          {showAnswer ? (
            <span className="text-green-600 font-mono">
              ✓ {answer}
              {normAnswer && normAnswer !== answer.toLowerCase().trim() && (
                <span className="text-slate-400 font-normal ml-1">({normAnswer})</span>
              )}
            </span>
          ) : (
            '→ Xem đáp án'
          )}
        </button>
      )}
    </div>
  );
});
