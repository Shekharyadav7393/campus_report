import { Request, Response, NextFunction } from 'express';
import { Campus } from '../models/Campus.js';
import { AppError } from '../utils/AppError.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

export const tenantHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantSlug = req.headers['x-tenant-slug'] as string;
    let campusId = (req.headers['x-tenant-id'] || req.query.campusId || req.body.campusId) as string;

    // If tenant slug is provided, resolve to campus ID
    if (tenantSlug && !campusId) {
      const campus = await Campus.findOne({ slug: tenantSlug.toLowerCase() });
      if (campus) {
        campusId = String(campus._id);
      }
    }

    // Resolve user context from JWT token if headers authentication is present
    let user = req.user;
    if (!user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = decoded; // holds id, role, campusId
      } catch (e) {
        // Let auth middleware reject this later if it's invalid
      }
    }

    // Enforce tenant setting if authenticated user is present
    if (user) {
      const userCampusId = user.campusId ? String(user.campusId) : null;
      
      // Super-admins can bypass tenant boundaries
      if (user.role === 'super-admin') {
        req.tenantId = campusId || undefined;
        return next();
      }

      if (!userCampusId) {
        return next(new AppError('User profile lacks tenant context configuration.', 400, 'TENANT_ERROR'));
      }

      // Enforce: User cannot query cross-tenant data!
      if (campusId && campusId !== userCampusId) {
        return next(new AppError('Forbidden: Cross-tenant data access is blocked.', 403, 'FORBIDDEN_TENANT_ACCESS'));
      }

      // Assign verified tenant
      req.tenantId = userCampusId;
    } else {
      // For public endpoints, assign resolved campus ID
      req.tenantId = campusId || undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
};
