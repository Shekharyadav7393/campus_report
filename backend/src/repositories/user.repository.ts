import { BaseRepository } from './base.repository.js';
import { User, IUser } from '../models/User.js';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email address (ignores soft deleted users)
   */
  public async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Add active JWT session details
   */
  public async addSession(userId: string, token: string, ip?: string, userAgent?: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $push: {
        sessions: {
          token,
          ip,
          userAgent,
          lastActive: new Date(),
        },
      },
    });
  }

  /**
   * Remove a single active session token (Logout)
   */
  public async removeSession(userId: string, token: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $pull: { sessions: { token } },
    });
  }

  /**
   * Clear all sessions for a user (force logout everywhere)
   */
  public async clearAllSessions(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: { sessions: [] },
    });
  }

  /**
   * Record a failed login attempt. Lock account if attempts exceed 5.
   */
  public async recordLoginFailure(userId: string): Promise<number> {
    const user = await this.model.findById(userId);
    if (!user) return 0;

    const attempts = user.failedLoginAttempts + 1;
    const update: any = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      // Lock account for 15 minutes
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + 15);
      update.lockUntil = lockTime;
    }

    await this.model.findByIdAndUpdate(userId, { $set: update });
    return attempts;
  }

  /**
   * Clear login attempts parameters after a successful login
   */
  public async resetLoginFailures(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: { failedLoginAttempts: 0 },
      $unset: { lockUntil: 1 },
    });
  }
}

export const userRepository = new UserRepository();
