import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['student', 'faculty', 'visitor', 'staff', 'campus-admin']),
    campusId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus reference'),
    departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid department reference').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const createCampusSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Campus name must be at least 3 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    address: z.string().optional(),
    domain: z.string().optional(),
    settings: z.object({
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color code').optional(),
      logoUrl: z.string().url('Invalid logo URL').optional(),
      allowedCategories: z.array(z.string()).optional(),
      slaHours: z.object({
        low: z.number().int().positive().optional(),
        medium: z.number().int().positive().optional(),
        high: z.number().int().positive().optional(),
        critical: z.number().int().positive().optional(),
      }).optional(),
    }).optional(),
  }),
});

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string().min(1, 'Category is required'),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    anonymous: z.boolean().optional(),
    location: z.object({
      building: z.string().min(1, 'Building name is required'),
      room: z.string().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }).optional(),
    }),
    attachments: z.array(z.string().url('Invalid attachment URL')).optional(),
  }),
});

export const updateReportSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'under-review', 'in-progress', 'resolved', 'rejected', 'closed']).optional(),
    departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional(),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment text is required'),
    isInternal: z.boolean().optional(),
    attachments: z.array(z.string().url('Invalid URL')).optional(),
  }),
});

export const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    content: z.string().min(5, 'Content must be at least 5 characters'),
    severity: z.enum(['info', 'warning', 'emergency']),
    expiresInDays: z.number().int().positive().optional(),
  }),
});
