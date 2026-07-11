import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_local_dev';

export class AuthService {
  /**
   * Hash plain password
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password check
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access and refresh tokens
   */
  public static generateTokens(user: IUser) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      campusId: user.campusId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh token rotation checks
   */
  public static async refreshAccessToken(oldRefreshToken: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    try {
      const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as { id: string };

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('Invalid session. Please login again.', 401, 'UNAUTHORIZED');
      }

      // Check if session token exists in active list
      const sessionIndex = user.sessions.findIndex((s) => s.token === oldRefreshToken);
      if (sessionIndex === -1) {
        // Attack detected! Clear all tokens
        user.sessions = [];
        await user.save();
        throw new AppError('Session reuse detected. Access revoked for security. Please login again.', 401, 'SECURITY_BREACH');
      }

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);

      // Rotate token
      user.sessions[sessionIndex].token = newRefreshToken;
      user.sessions[sessionIndex].lastActive = new Date();
      await user.save();

      return { accessToken, newRefreshToken };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid or expired session. Please login again.', 401, 'UNAUTHORIZED');
    }
  }
}
export default AuthService;
