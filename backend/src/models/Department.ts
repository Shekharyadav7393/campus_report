import { Schema, model, Document, Types } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  campusId: Types.ObjectId; // Tenant reference
  head?: Types.ObjectId; // Reference to a User who is the head/lead
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    head: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
DepartmentSchema.index({ campusId: 1, name: 1 }, { unique: true });

export const Department = model<IDepartment>('Department', DepartmentSchema);
