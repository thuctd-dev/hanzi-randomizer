'use client';

import { useState } from 'react';
import { Trash2, BookOpen, Plus, Loader2 } from 'lucide-react';

export interface Topic {
  name: string;
  lessonCount?: number;
}

interface TopicPickerProps {
  topics: Topic[];
  isLoading: boolean;
  onSelect: (topicName: string) => void;
  onDelete: (topicName: string) => void;
  onAdd: (topicName: string) => Promise<void>;
}

export default function TopicPicker({ topics, isLoading, onSelect, onDelete, onAdd }: TopicPickerProps) {
  const [newName, setNewName]     = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      await onAdd(name);
      setNewName('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold text-white/80 uppercase tracking-widest mb-4">
          <BookOpen className="w-3.5 h-3.5" />
          {topics.length} chủ đề
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">
          Chọn chủ đề để học
        </h2>
        <p className="text-white/55 text-sm">Chọn chủ đề trước rồi chọn bài học phù hợp.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topics.map((topic) => (
          <div
            key={topic.name}
            className="group relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <div className="px-4 py-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-white text-sm font-bold truncate">{topic.name}</h3>
                  <p className="text-xs text-white/50 mt-1">
                    {topic.lessonCount != null
                      ? `${topic.lessonCount} bài học`
                      : 'Chủ đề học'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(topic.name); }}
                  className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-opacity opacity-0 group-hover:opacity-100"
                  title="Xóa chủ đề"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => onSelect(topic.name)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                Mở chủ đề
              </button>
            </div>
          </div>
        ))}

        {/* ── Thêm chủ đề mới ── */}
        {showForm ? (
          <form
            onSubmit={handleAdd}
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg p-4 flex flex-col gap-3"
          >
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              placeholder="Tên chủ đề mới..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:ring-2 focus:ring-white/30"
            />
            {error && <p className="text-red-300 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-40"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tạo
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewName(''); setError(''); }}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-semibold transition-all"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-dashed border-white/20 hover:border-white/40 shadow-lg px-4 py-5 text-white/50 hover:text-white/80 text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm chủ đề
          </button>
        )}
      </div>
    </div>
  );
}
