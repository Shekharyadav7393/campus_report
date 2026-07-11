import { Schema, model, Document, Types } from 'mongoose';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'open' | 'under-review' | 'in-progress' | 'resolved' | 'rejected' | 'closed';

export interface IReport extends Document {
  ticketId: string;
  reporter?: Types.ObjectId;
  anonymous: boolean;
  title: string;
  description: string;
  category: string;
  severity: ReportSeverity;
  status: ReportStatus;
  campusId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  location: {
    building: string;
    room?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  attachments: string[];
  upvotes: Types.ObjectId[];
  subscribers: Types.ObjectId[];
  slaDeadline?: Date;
  resolvedAt?: Date;
  isDraft: boolean; // Support for saving drafts
  isDeleted: boolean; // Soft delete support
  deletedAt?: Date;
  mergedInto?: Types.ObjectId; // Support for merging duplicate reports
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    ticketId: { type: String, required: true, unique: true },
    reporter: { type: Schema.Types.ObjectId, ref: 'User' },
    anonymous: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    status: {
      type: String,
      required: true,
      enum: ['open', 'under-review', 'in-progress', 'resolved', 'rejected', 'closed'],
      default: 'open',
    },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    location: {
      building: { type: String, required: true, trim: true },
      room: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    attachments: { type: [String], default: [] },
    upvotes: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    subscribers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    slaDeadline: { type: Date },
    resolvedAt: { type: Date },
    isDraft: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    mergedInto: { type: Schema.Types.ObjectId, ref: 'Report' },
  },
  { timestamps: true }
);

// Indexes
ReportSchema.index({ campusId: 1 });
ReportSchema.index({ campusId: 1, status: 1 });
ReportSchema.index({ campusId: 1, category: 1 });
ReportSchema.index({ campusId: 1, assignedTo: 1 });
ReportSchema.index({ slaDeadline: 1 });
ReportSchema.index({ isDeleted: 1 });
ReportSchema.index({ 'location.coordinates': '2dsphere' });

export const Report = model<IReport>('Report', ReportSchema);
export default Report;
