import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { UserRole } from '../models/User.js';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this resource.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
