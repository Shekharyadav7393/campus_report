import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'super-admin' | 'campus-admin' | 'staff' | 'student' | 'faculty' | 'visitor';

export interface IUserSession {
  _id?: Types.ObjectId;
  token: string;
  ip?: string;
  userAgent?: string;
  lastActive: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  campusId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  isVerified: boolean;
  status: 'active' | 'suspended';
  sessions: IUserSession[]; // Advanced session tracking for RTR & audit logs
  failedLoginAttempts: number;
  lockUntil?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['super-admin', 'campus-admin', 'staff', 'student', 'faculty', 'visitor'],
      default: 'student',
    },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    sessions: [
      {
        token: { type: String, required: true },
        ip: { type: String },
        userAgent: { type: String },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ campusId: 1 });
UserSchema.index({ role: 1 });

export const User = model<IUser>('User', UserSchema);
export default User;
