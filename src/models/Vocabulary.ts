import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  hanzi: string;
  pinyin: string;
  meaning: string;
  topic?: string;   // optional – từ thuộc chủ đề nào (nếu có)
  lesson?: string;  // optional – từ thuộc bài học nào (nếu có)
  createdAt: Date;
}

const VocabularySchema: Schema = new Schema({
  hanzi:   { type: String, required: true },
  pinyin:  { type: String, required: true },
  meaning: { type: String, required: true },
  topic:   { type: String, default: null },
  lesson:  { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Vocabulary = mongoose.models.Vocabulary || mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);

export default Vocabulary;
