import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  name: string;
  order: number;
  createdAt: Date;
}

const LessonSchema: Schema = new Schema({
  name:  { type: String, required: true, unique: true, trim: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

LessonSchema.index({ order: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
