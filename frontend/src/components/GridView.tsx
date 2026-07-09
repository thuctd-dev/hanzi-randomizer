'use client';

import { useState } from 'react';
import { Edit2, Trash2, Check, X, Plus, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';

export interface Vocabulary {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  topic?: string | null;
  lesson?: string | null;
}

interface GridViewProps {
  vocabularies: Vocabulary[];
  topic?: string | null;
  lesson?: string;
  onDataChange: () => void;
}

export default function GridView({ vocabularies, topic, lesson, onDataChange }: GridViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ hanzi: '', pinyin: '', meaning: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRow, setNewRow] = useState({ hanzi: '', pinyin: '', meaning: '' });

  const handleEdit = (vocab: Vocabulary) => {
    setEditingId(vocab.id);
    setEditForm({ hanzi: vocab.hanzi, pinyin: vocab.pinyin, meaning: vocab.meaning });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ hanzi: '', pinyin: '', meaning: '' });
  };

  const handleSave = async (id: string) => {
    if (!editForm.hanzi || !editForm.pinyin || !editForm.meaning) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/vocabulary/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditingId(null); onDataChange(); }
    } catch (e) {
      console.error('Failed to update', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa từ vựng này?')) return;
    try {
      const res = await fetch(apiUrl(`/api/vocabulary/${id}`), { method: 'DELETE' });
      if (res.ok) onDataChange();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const handleAdd = async () => {
    if (!newRow.hanzi || !newRow.pinyin || !newRow.meaning) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { items: [newRow] };
      if (topic?.trim())  body.topic  = topic.trim();
      if (lesson?.trim()) body.lesson = lesson.trim();
      const res = await fetch(apiUrl('/api/vocabulary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setNewRow({ hanzi: '', pinyin: '', meaning: '' }); onDataChange(); }
    } catch (e) {
      console.error('Failed to add', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 bg-white';

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5 w-[22%]">Hán tự</th>
              <th className="py-3 px-5 w-[22%]">Bính âm</th>
              <th className="py-3 px-5">Nghĩa</th>
              <th className="py-3 px-5 w-24 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">

            {/* ── Add new row ── */}
            <tr className="bg-blue-50/40">
              <td className="py-2.5 px-4">
                <input
                  type="text"
                  placeholder="Hán tự mới..."
                  className={`${inputCls} hanzi text-lg font-bold border-blue-200`}
                  value={newRow.hanzi}
                  onChange={(e) => setNewRow({ ...newRow, hanzi: e.target.value })}
                />
              </td>
              <td className="py-2.5 px-4">
                <input
                  type="text"
                  placeholder="Bính âm..."
                  className={`${inputCls} border-blue-200`}
                  value={newRow.pinyin}
                  onChange={(e) => setNewRow({ ...newRow, pinyin: e.target.value })}
                />
              </td>
              <td className="py-2.5 px-4">
                <input
                  type="text"
                  placeholder="Nghĩa..."
                  className={`${inputCls} border-blue-200`}
                  value={newRow.meaning}
                  onChange={(e) => setNewRow({ ...newRow, meaning: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td className="py-2.5 px-4 text-center">
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting || !newRow.hanzi || !newRow.pinyin || !newRow.meaning}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                  title="Thêm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
            </tr>

            {/* ── Existing rows ── */}
            {vocabularies.map((vocab) => {
              const isEditing = editingId === vocab.id;
              return (
                <tr key={vocab.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-5">
                    {isEditing ? (
                      <input
                        className={`${inputCls} hanzi text-lg font-bold`}
                        value={editForm.hanzi}
                        onChange={(e) => setEditForm({ ...editForm, hanzi: e.target.value })}
                      />
                    ) : (
                      <span className="hanzi text-xl font-bold text-slate-900">{vocab.hanzi}</span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    {isEditing ? (
                      <input
                        className={inputCls}
                        value={editForm.pinyin}
                        onChange={(e) => setEditForm({ ...editForm, pinyin: e.target.value })}
                      />
                    ) : (
                      <span className="font-medium text-slate-700">{vocab.pinyin}</span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    {isEditing ? (
                      <input
                        className={inputCls}
                        value={editForm.meaning}
                        onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                      />
                    ) : (
                      <span className="text-slate-500 text-xs leading-snug">{vocab.meaning}</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSave(vocab.id)}
                          disabled={isSubmitting}
                          className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors active:scale-95"
                        >
                          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(vocab)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors active:scale-95"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(vocab.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {vocabularies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center text-slate-400 text-sm">
                  Chưa có từ vựng nào. Thêm từ mới ở ô bên trên.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
