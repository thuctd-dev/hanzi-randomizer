import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  name: string;
  createdAt: Date;
}

const TopicSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const Topic = mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);

export default Topic;
