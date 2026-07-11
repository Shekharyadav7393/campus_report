import { Schema, model, Document, Types } from 'mongoose';

export type CommentType = 'comment' | 'status_change' | 'assignment_change' | 'system_log';

export interface IComment extends Document {
  reportId: Types.ObjectId; // Reference to Report
  author?: Types.ObjectId; // Reference to User. Optional if anonymous or system.
  authorRole?: string; // String copy of role for fast label rendering (e.g. "Staff", "Student")
  content: string;
  type: CommentType;
  oldValue?: string;
  newValue?: string;
  attachments: string[];
  isInternal: boolean; // True means only resolvers & admins can see it
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    authorRole: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['comment', 'status_change', 'assignment_change', 'system_log'],
      default: 'comment',
    },
    oldValue: { type: String },
    newValue: { type: String },
    attachments: { type: [String], default: [] },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Only track creation time
);

// Indexes
CommentSchema.index({ reportId: 1 });
CommentSchema.index({ reportId: 1, isInternal: 1 });

export const Comment = model<IComment>('Comment', CommentSchema);
