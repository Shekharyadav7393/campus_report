import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  campusId?: string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Check for token in cookies
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
    }

    // Verify token
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
    const decoded = jwt.verify(token, secret) as DecodedToken;

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401, 'UNAUTHORIZED'));
    }

    if (user.status === 'suspended') {
      return next(new AppError('Your account has been suspended.', 403, 'ACCOUNT_SUSPENDED'));
    }

    // Assign user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
