import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  name: string;
  createdAt: Date;
}

const LessonSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);

export default Lesson;
