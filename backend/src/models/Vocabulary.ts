import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  hanzi: string;
  pinyin: string;
  meaning: string;
  topic?: string | null;
  lesson?: string | null;
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

// Index for common query patterns
VocabularySchema.index({ lesson: 1 });
VocabularySchema.index({ topic: 1 });

const Vocabulary = mongoose.models.Vocabulary || mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
export default Vocabulary;
