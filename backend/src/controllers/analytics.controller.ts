import { Request, Response, NextFunction } from 'express';
import { Report } from '../models/Report.js';
import { AppError } from '../utils/AppError.js';

export class AnalyticsController {
  /**
   * Fetch statistical aggregates for Dashboard widgets and graphs
   */
  public static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.user?.campusId;
      if (!campusId && req.user?.role !== 'super-admin') {
        return next(new AppError('Campus identifier missing', 400, 'BAD_REQUEST'));
      }

      // Enforce tenant boundary
      const query: any = {};
      if (req.user?.role !== 'super-admin') {
        query.campusId = campusId;
      }

      const totalReports = await Report.countDocuments(query);

      // Status breakdown
      const statusCounts = await Report.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const statusMap = {
        open: 0,
        'under-review': 0,
        'in-progress': 0,
        resolved: 0,
        rejected: 0,
        closed: 0,
      };
      statusCounts.forEach((s) => {
        if (s._id in statusMap) {
          (statusMap as any)[s._id] = s.count;
        }
      });

      // Category breakdown
      const categoryCounts = await Report.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // SLA Breaches
      const now = new Date();
      const slaBreaches = await Report.countDocuments({
        ...query,
        status: { $nin: ['resolved', 'rejected', 'closed'] },
        slaDeadline: { $lt: now },
      });

      // Monthly Trend (for Chart rendering)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1); // Set to start of month

      const trendData = await Report.aggregate([
        {
          $match: {
            ...query,
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          summary: {
            total: totalReports,
            open: statusMap.open,
            inProgress: statusMap['in-progress'],
            resolved: statusMap.resolved,
            slaBreached: slaBreaches,
          },
          statusCounts: statusMap,
          categoryCounts: categoryCounts.map((c) => ({ category: c._id, count: c.count })),
          trend: trendData.map((t) => ({
            period: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
            count: t.count,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
