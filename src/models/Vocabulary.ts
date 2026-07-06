import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  hanzi: string;
  pinyin: string;
  meaning: string;
  topic: string;
  lesson: string;
  createdAt: Date;
}

const VocabularySchema: Schema = new Schema({
  hanzi: { type: String, required: true },
  pinyin: { type: String, required: true },
  meaning: { type: String, required: true },
  topic: { type: String, required: true },
  lesson: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Prevent Mongoose from creating the model multiple times in Next.js
const Vocabulary = mongoose.models.Vocabulary || mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);

export default Vocabulary;
