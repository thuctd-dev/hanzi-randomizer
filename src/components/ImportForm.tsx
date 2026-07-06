'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, CheckCircle, FileText, BookMarked, Eye, AlertCircle } from 'lucide-react';
import { parseVocabularyText, ParsedItem } from '@/lib/parseVocabulary';

interface ImportFormProps {
  onSuccess: (topic?: string) => void;
  topic?: string | null;
}

export default function ImportForm({ onSuccess, topic: initialTopic }: ImportFormProps) {
  const [topic, setTopic] = useState(initialTopic ?? '');
  const [lesson, setLesson] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null; message: string }>({
    type: null,
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Live parse preview ──────────────────────────────────────────────────
  const parsed: ParsedItem[] = useMemo(() => {
    if (!text.trim()) return [];
    return parseVocabularyText(text);
  }, [text]);

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!topic.trim() && initialTopic) {
      setTopic(initialTopic);
    }
    if (!lesson.trim()) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setLesson(name);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setText(event.target.result as string);
        setShowPreview(true);
        setStatus({ type: null, message: '' });
      }
    };
    reader.onerror = () => setStatus({ type: 'error', message: 'Không thể đọc file.' });
    reader.readAsText(file, 'utf-8');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !text.trim() || !lesson.trim()) return;

    if (parsed.length === 0) {
      setStatus({ type: 'error', message: 'Không tìm thấy từ vựng hợp lệ. Vui lòng kiểm tra lại dữ liệu.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const topicName = topic.trim();
      const lessonName = lesson.trim();

      const topicRes = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: topicName }),
      });
      if (!topicRes.ok && topicRes.status !== 409) {
        const err = await topicRes.json();
        throw new Error(err.error || 'Không thể tạo chủ đề mới.');
      }

      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed, topic: topicName, lesson: lessonName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi lưu vào database.');

      setStatus({
        type: 'success',
        message: `Đã lưu thành công ${data.count} từ vựng vào "${topicName} / ${lessonName}"!`,
      });
      setText('');
      setLesson('');
      setShowPreview(false);

      setTimeout(() => {
        onSuccess(topicName);
        setStatus({ type: null, message: '' });
      }, 2000);
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi không xác định.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Upload className="w-6 h-6 text-blue-600" />
            Nhập Từ Vựng Mới
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Hỗ trợ tự động nhận diện hai định dạng:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <code className="bg-slate-100 px-2 py-1 rounded text-pink-600 font-mono text-xs">
              忙 | máng | Bận rộn
            </code>
            <span className="text-slate-400 text-xs self-center">hoặc</span>
            <code className="bg-slate-100 px-2 py-1 rounded text-violet-600 font-mono text-xs">
              你{'   '}nǐ{'   '}bạn, anh, chị
            </code>
          </div>
        </div>

        <div className="shrink-0">
          <input
            type="file"
            accept=".txt,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
          >
            <FileText className="w-4 h-4" />
            Tải file lên
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-blue-500" />
              Tên chủ đề <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Giao tiếp hàng ngày"
            className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Lesson name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-blue-500" />
              Tên bài học <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="VD: Bài 1 – Giới thiệu bản thân"
            className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Raw text input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Dán văn bản hoặc tải file
          </label>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setShowPreview(false); }}
            placeholder={
              '你   nǐ   bạn, anh, chị\n女   nǚ   nữ, phụ nữ\n\n— hoặc định dạng cũ —\n忙 | máng | Bận, bận rộn'
            }
            className="w-full h-44 p-5 border-2 border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-slate-700 leading-relaxed placeholder:text-slate-400 font-mono text-sm"
          />
        </div>

        {/* Parse status bar */}
        {text.trim() !== '' && (
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium
            ${parsed.length > 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}
          >
            <div className="flex items-center gap-2">
              {parsed.length > 0
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {parsed.length > 0
                ? `Nhận diện được ${parsed.length} từ vựng`
                : 'Chưa nhận diện được từ vựng nào — kiểm tra lại định dạng'}
            </div>
            {parsed.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 text-green-600 hover:text-green-800 transition-colors font-semibold"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
              </button>
            )}
          </div>
        )}

        {/* Preview table */}
        {showPreview && parsed.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Xem trước — {parsed.length} từ
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
                  <tr className="text-slate-500 text-xs border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-semibold w-1/4">Hanzi</th>
                    <th className="text-left py-2 px-4 font-semibold w-1/4">Pinyin</th>
                    <th className="text-left py-2 px-4 font-semibold">Nghĩa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.map((item, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2 px-4 font-bold text-slate-800 text-base">{item.hanzi}</td>
                      <td className="py-2 px-4 text-slate-600">{item.pinyin}</td>
                      <td className="py-2 px-4 text-slate-500 text-xs leading-snug">{item.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status message */}
        {status.type && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium
            ${status.type === 'error'
              ? 'bg-red-50 text-red-600 border border-red-100'
              : 'bg-green-50 text-green-600 border border-green-100'}`}
          >
            {status.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {status.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {status.message}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            {parsed.length > 0 && `${parsed.length} từ sẵn sàng lưu`}
          </p>
          <button
            type="submit"
            disabled={isSubmitting || parsed.length === 0 || !lesson.trim()}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Lưu ${parsed.length > 0 ? parsed.length + ' từ' : ''} vào MongoDB`}
          </button>
        </div>
      </form>
    </div>
  );
}
