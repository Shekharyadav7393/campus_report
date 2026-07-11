import { IUser } from '../models/User.js';

export interface UserSessionDTO {
  id: string;
  ip?: string;
  userAgent?: string;
  lastActive: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  campusId?: string;
  isVerified: boolean;
  status: string;
  twoFactorEnabled: boolean;
  sessions?: UserSessionDTO[];
  createdAt: string;
}

export class UserDTO {
  public static toResponse(user: IUser): UserResponseDTO {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      campusId: user.campusId ? String(user.campusId) : undefined,
      isVerified: user.isVerified,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      sessions: user.sessions?.map((s) => ({
        id: String(s._id || s.token.substring(0, 10)), // safe identifier
        ip: s.ip,
        userAgent: s.userAgent,
        lastActive: s.lastActive.toISOString(),
      })),
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  public static toListResponse(users: IUser[]): UserResponseDTO[] {
    return users.map((u) => this.toResponse(u));
  }
}
