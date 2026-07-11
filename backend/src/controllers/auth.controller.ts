import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Campus } from '../models/Campus.js';
import { AuthService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { UserDTO } from '../dto/user.dto.js';
import { AppError } from '../utils/AppError.js';
import { AuditLog } from '../models/AuditLog.js';

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

export class AuthController {
  /**
   * Register a new user under a campus tenant
   */
  public static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role, campusId, departmentId } = req.body;

      // 1. Verify campus
      const campus = await Campus.findById(campusId);
      if (!campus) {
        return next(new AppError('Selected campus does not exist', 404, 'CAMPUS_NOT_FOUND'));
      }

      // Prevent role escalations
      if (['super-admin', 'campus-admin'].includes(role)) {
        return next(new AppError('Action forbidden. Administrators must be invited.', 403, 'FORBIDDEN'));
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        return next(new AppError('Email address already registered.', 400, 'EMAIL_EXISTS'));
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Simple domain match checks
      const emailDomain = email.split('@')[1]?.toLowerCase();
      const isVerified = campus.domain?.toLowerCase() === emailDomain;

      const user = await userRepository.create({
        name,
        email,
        passwordHash,
        role,
        campusId,
        departmentId,
        isVerified,
      });

      // Generate tokens
      const { accessToken, refreshToken } = AuthService.generateTokens(user);
      
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      await userRepository.addSession(String(user._id), refreshToken, ip, userAgent);

      // Audit Log
      await AuditLog.create({
        userId: user._id,
        campusId: user.campusId,
        action: 'USER_SIGNUP',
        ip,
        userAgent,
        details: `Account registered as ${role}. Domain verify: ${isVerified}`,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: {
          user: UserDTO.toResponse(user),
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log in user
   */
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
      }

      // Lock check
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (1000 * 60));
        return next(new AppError(`Account is temporarily locked. Try again in ${remainingMinutes} minutes.`, 403, 'ACCOUNT_LOCKED'));
      }

      // Match password
      const isMatch = await AuthService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        const attempts = await userRepository.recordLoginFailure(String(user._id));
        await AuditLog.create({
          userId: user._id,
          campusId: user.campusId,
          action: 'LOGIN_FAILURE',
          ip,
          userAgent,
          details: `Failed attempt #${attempts}`,
        });

        if (attempts >= 5) {
          return next(new AppError('Account locked due to 5 failed login attempts. Try again in 15 minutes.', 403, 'ACCOUNT_LOCKED'));
        }
        return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
      }

      // Reset fails
      await userRepository.resetLoginFailures(String(user._id));

      // Generate tokens
      const { accessToken, refreshToken } = AuthService.generateTokens(user);
      await userRepository.addSession(String(user._id), refreshToken, ip, userAgent);

      await AuditLog.create({
        userId: user._id,
        campusId: user.campusId,
        action: 'USER_LOGIN',
        ip,
        userAgent,
        details: 'Successful auth login',
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user: UserDTO.toResponse(user),
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out
   */
  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        const decoded = jwt.decode(refreshToken) as { id: string } | null;
        if (decoded?.id) {
          await userRepository.removeSession(decoded.id, refreshToken);
          await AuditLog.create({
            userId: decoded.id as any,
            action: 'USER_LOGOUT',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            details: 'Successful session logout',
          });
        }
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
      });

      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token
   */
  public static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const oldRefreshToken = req.cookies.refreshToken;
      if (!oldRefreshToken) {
        return next(new AppError('No refresh token provided. Please log in.', 401, 'UNAUTHORIZED'));
      }

      const { accessToken, newRefreshToken } = await AuthService.refreshAccessToken(oldRefreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch current session profile details
   */
  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }
      res.status(200).json({
        success: true,
        data: { user: UserDTO.toResponse(req.user) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change user account password
   */
  public static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      const isMatch = await AuthService.comparePassword(oldPassword, req.user.passwordHash);
      if (!isMatch) {
        return next(new AppError('Incorrect current password.', 400, 'BAD_REQUEST'));
      }

      req.user.passwordHash = await AuthService.hashPassword(newPassword);
      await req.user.save();

      await AuditLog.create({
        userId: req.user._id,
        campusId: req.user.campusId,
        action: 'PASSWORD_CHANGE',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: 'User password changed successfully',
      });

      res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a specific session device by token identifier (e.g. from session logs list)
   */
  public static async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      // Find token matching sessionId format
      const targetSession = req.user.sessions.find(s => String(s._id || s.token.substring(0, 10)) === sessionId);
      if (targetSession) {
        await userRepository.removeSession(String(req.user._id), targetSession.token);
      }

      res.status(200).json({ success: true, message: 'Session revoked successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminate all other sessions (logout all other devices)
   */
  public static async revokeAllOtherSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      const currentToken = req.cookies.refreshToken;
      
      // Filter list keeping only current session token
      req.user.sessions = req.user.sessions.filter(s => s.token === currentToken);
      await req.user.save();

      res.status(200).json({ success: true, message: 'All other sessions terminated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mock enable/disable 2FA authentication flow
   */
  public static async toggle2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const { enable } = req.body;
      if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      req.user.twoFactorEnabled = enable;
      req.user.twoFactorSecret = enable ? 'MOCK_SECRET_XYZ_123' : undefined;
      await req.user.save();

      await AuditLog.create({
        userId: req.user._id,
        action: enable ? '2FA_ENABLED' : '2FA_DISABLED',
        ip: req.ip,
        details: `Two-factor enabled set to ${enable}`,
      });

      res.status(200).json({
        success: true,
        data: {
          twoFactorEnabled: enable,
          qrCodeMock: enable ? 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/CampusReport?secret=MOCK_SECRET_XYZ_123' : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mock Social OAuth Logins (Google / GitHub)
   */
  public static async oauthLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { provider, token } = req.body;
      
      // Simulating OAuth verification checks
      if (!token) return next(new AppError('OAuth validation token missing', 400, 'BAD_REQUEST'));

      // Resolve fake profile
      const email = `oauth_${provider}_user@university.edu`;
      let user = await userRepository.findByEmail(email);

      if (!user) {
        // Auto-signup fake campus
        const campus = await Campus.findOne();
        const campusId = campus ? campus._id : undefined;

        user = await userRepository.create({
          name: `${provider.toUpperCase()} User`,
          email,
          passwordHash: await AuthService.hashPassword('OAuth_Random_Fallback_Password'),
          role: 'student',
          campusId,
          isVerified: true,
        });
      }

      const { accessToken, refreshToken } = AuthService.generateTokens(user);
      await userRepository.addSession(String(user._id), refreshToken, req.ip, req.headers['user-agent']);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user: UserDTO.toResponse(user),
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
