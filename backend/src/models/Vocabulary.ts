import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVocabulary extends Document {
  hanzi: string;
  pinyin: string;
  meaning: string;
  lessonId?: Types.ObjectId | null;
  topic?: string | null;
  createdAt: Date;
}

const VocabularySchema: Schema = new Schema({
  hanzi:    { type: String, required: true },
  pinyin:   { type: String, required: true },
  meaning:  { type: String, required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },
  topic:    { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

VocabularySchema.index({ lessonId: 1 });
VocabularySchema.index({ topic: 1 });

const Vocabulary = mongoose.models.Vocabulary || mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
export default Vocabulary;
