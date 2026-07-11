import { Schema, model, Document } from 'mongoose';

export interface ICampus extends Document {
  name: string;
  slug: string;
  address?: string;
  domain?: string; // Optional domain name (e.g. mit.edu) for auto-approving signups
  settings: {
    primaryColor: string;
    logoUrl?: string;
    allowedCategories: string[];
    slaHours: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const CampusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String },
    domain: { type: String, lowercase: true, trim: true },
    settings: {
      primaryColor: { type: String, default: '#3b82f6' },
      logoUrl: { type: String },
      allowedCategories: {
        type: [String],
        default: ['Facility Maintenance', 'IT Support', 'Security/Safety', 'Lost & Found', 'Academic', 'Others'],
      },
      slaHours: {
        low: { type: Number, default: 72 },
        medium: { type: Number, default: 48 },
        high: { type: Number, default: 24 },
        critical: { type: Number, default: 4 },
      },
    },
  },
  { timestamps: true }
);

// Index slug and domain for fast lookups
CampusSchema.index({ slug: 1 });
CampusSchema.index({ domain: 1 });

export const Campus = model<ICampus>('Campus', CampusSchema);
