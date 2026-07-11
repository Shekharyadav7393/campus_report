import { Request, Response, NextFunction } from 'express';
import { Notice } from '../models/Notice.js';
import { AppError } from '../utils/AppError.js';
import { SocketService } from '../services/socket.service.js';

export class NoticeController {
  /**
   * Broadcast a campus notice
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      const userId = String(req.user?._id);
      const { title, content, severity, expiresInDays } = req.body;

      if (!campusId) {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      let expiresAt: Date | undefined;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      const notice = new Notice({
        campusId,
        title,
        content,
        severity,
        expiresAt,
        author: userId,
      });

      const savedNotice = await notice.save();

      // Emit notice event to campus room
      SocketService.notifyRoom(`campus_${campusId}`, 'new_notice', savedNotice);

      res.status(201).json({
        success: true,
        data: savedNotice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all current active notices for a campus
   */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      if (!campusId) {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      const now = new Date();
      const notices = await Notice.find({
        campusId,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } },
        ],
      })
        .populate('author', 'name role')
        .sort('-createdAt');

      res.status(200).json({
        success: true,
        data: notices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a notice (Campus Admin only)
   */
  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notice = await Notice.findById(id);

      if (!notice) {
        return next(new AppError('Notice not found', 404, 'NOT_FOUND'));
      }

      // Check tenant permissions
      if (String(notice.campusId) !== String(req.user?.campusId)) {
        return next(new AppError('Forbidden action', 403, 'FORBIDDEN'));
      }

      await notice.deleteOne();

      res.status(200).json({
        success: true,
        message: 'Notice removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
