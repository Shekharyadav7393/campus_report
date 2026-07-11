import { Request, Response, NextFunction } from 'express';
import { Campus } from '../models/Campus.js';
import { CampusService } from '../services/campus.service.js';
import { AppError } from '../utils/AppError.js';

export class CampusController {
  /**
   * Create a new campus tenant (Super Admin only)
   */
  public static async createCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const campus = await CampusService.createCampus(req.body);
      res.status(201).json({
        success: true,
        data: campus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all registered campuses (Public endpoint for registration dropdowns)
   */
  public static async listCampuses(req: Request, res: Response, next: NextFunction) {
    try {
      const campuses = await CampusService.getAllCampuses();
      res.status(200).json({
        success: true,
        data: campuses,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campus details and settings by its subdomain slug (Public endpoint for dynamic tenant coloring/logo)
   */
  public static async getCampusBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      if (!slug) {
        return next(new AppError('Slug is required', 400, 'BAD_REQUEST'));
      }
      const campus = await CampusService.getCampusBySlug(slug);
      res.status(200).json({
        success: true,
        data: campus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update campus settings (Campus Admin / Super Admin only)
   */
  public static async updateCampusSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const campus = await Campus.findById(id);
      if (!campus) {
        return next(new AppError('Campus not found', 404, 'CAMPUS_NOT_FOUND'));
      }

      // Check tenant authorization
      if (req.user?.role !== 'super-admin' && String(req.user?.campusId) !== id) {
        return next(new AppError('Unauthorized access to tenant settings', 403, 'FORBIDDEN'));
      }

      const { name, address, settings } = req.body;
      if (name) campus.name = name;
      if (address) campus.address = address;
      if (settings) {
        campus.settings = { ...campus.settings, ...settings };
      }

      const updatedCampus = await campus.save();
      res.status(200).json({
        success: true,
        data: updatedCampus,
      });
    } catch (error) {
      next(error);
    }
  }
}
