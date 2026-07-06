import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  name: string;
  topic: string;
  createdAt: Date;
}

const LessonSchema: Schema = new Schema({
  name: { type: String, required: true },
  topic: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

LessonSchema.index({ name: 1, topic: 1 }, { unique: true });

const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);

export default Lesson;
