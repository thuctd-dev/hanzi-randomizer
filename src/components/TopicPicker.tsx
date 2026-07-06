'use client';

import { Trash2, BookOpen } from 'lucide-react';

export interface Topic {
  name: string;
}

interface TopicPickerProps {
  topics: Topic[];
  isLoading: boolean;
  onSelect: (topicName: string) => void;
  onDelete: (topicName: string) => void;
}

export default function TopicPicker({ topics, isLoading, onSelect, onDelete }: TopicPickerProps) {
  if (isLoading || topics.length === 0) return null;

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
        {topics.map((topic, index) => (
          <div
            key={topic.name}
            className="group relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <div className="px-4 py-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-white text-sm font-bold truncate">{topic.name}</h3>
                  <p className="text-xs text-white/50 mt-1">Chủ đề học</p>
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
      </div>
    </div>
  );
}
