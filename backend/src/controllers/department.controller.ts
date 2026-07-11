import { Request, Response, NextFunction } from 'express';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export class DepartmentController {
  /**
   * List all departments for the authenticated campus
   */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      if (!campusId) {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      const departments = await Department.find({ campusId }).populate('head', 'name email');
      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new department (Campus Admin only)
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      const { name, head } = req.body;

      if (!campusId) {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      const existing = await Department.findOne({ name, campusId });
      if (existing) {
        return next(new AppError('Department already exists', 400, 'BAD_REQUEST'));
      }

      const dept = new Department({
        name,
        campusId,
        head,
      });

      const savedDept = await dept.save();
      res.status(201).json({
        success: true,
        data: savedDept,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List resolvers/staff members for assignment dropdowns
   */
  public static async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      if (!campusId) {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      const staffMembers = await User.find(
        { campusId, role: { $in: ['staff', 'campus-admin'] } },
        'name email role departmentId'
      ).populate('departmentId', 'name');

      res.status(200).json({
        success: true,
        data: staffMembers,
      });
    } catch (error) {
      next(error);
    }
  }
}
