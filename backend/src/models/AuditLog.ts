import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  action: string; // e.g. 'USER_LOGIN', 'TICKET_CREATE', 'ASSIGNMENT_CHANGE', 'TWOFA_ENABLE'
  ip?: string;
  userAgent?: string;
  details: string; // JSON string or human-readable description of change
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    action: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ campusId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
