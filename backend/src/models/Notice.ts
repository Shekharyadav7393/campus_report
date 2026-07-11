import { Schema, model, Document, Types } from 'mongoose';

export interface INotice extends Document {
  campusId: Types.ObjectId; // Tenant reference
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'emergency';
  expiresAt?: Date;
  author: Types.ObjectId; // Reference to Admin/Staff creator
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'emergency'],
      default: 'info',
    },
    expiresAt: { type: Date },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Indexes
NoticeSchema.index({ campusId: 1 });
NoticeSchema.index({ campusId: 1, expiresAt: 1 });

export const Notice = model<INotice>('Notice', NoticeSchema);
