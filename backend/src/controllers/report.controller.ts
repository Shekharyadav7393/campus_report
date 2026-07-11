import { Request, Response, NextFunction } from 'express';
import { Report } from '../models/Report.js';
import { Comment } from '../models/Comment.js';
import { Campus } from '../models/Campus.js';
import { reportRepository } from '../repositories/report.repository.js';
import { ReportService } from '../services/report.service.js';
import { AIService } from '../services/ai.service.js';
import { ReportDTO } from '../dto/report.dto.js';
import { AppError } from '../utils/AppError.js';
import { SocketService } from '../services/socket.service.js';
import { AuditLog } from '../models/AuditLog.js';

export class ReportController {
  /**
   * Submit a new incident report or save a draft
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const reporterId = req.user?._id ? String(req.user._id) : undefined;
      const campusId = req.tenantId || req.body.campusId;

      if (!campusId) {
        return next(new AppError('Campus identification is required', 400, 'BAD_REQUEST'));
      }

      // AI auto-classification parameters
      const { title, description, category, severity, isDraft } = req.body;
      let finalCategory = category;
      let finalSeverity = severity;

      // If category or severity are missing, trigger AI helper classification
      if (!isDraft && (!category || !severity)) {
        const suggestion = AIService.classifyTicket(title, description);
        finalCategory = category || suggestion.category;
        finalSeverity = severity || suggestion.severity;
      }

      // Generate ticketId
      const campus = await Campus.findById(campusId);
      if (!campus) return next(new AppError('Campus not found', 404, 'NOT_FOUND'));
      const reportCount = await reportRepository.countReports({ campusId });
      const ticketId = `${campus.slug.toUpperCase()}-${1001 + reportCount}`;

      // Smart Resolver Assignment
      let assignedTo: string | undefined;
      if (!isDraft && finalCategory) {
        assignedTo = await AIService.recommendResolver(campusId, finalCategory);
      }

      // Construct report data
      const reportData = {
        ...req.body,
        ticketId,
        campusId,
        category: finalCategory || 'Others',
        severity: finalSeverity || 'low',
        reporter: req.body.anonymous ? undefined : reporterId,
        assignedTo,
        isDraft: !!isDraft,
      };

      const report = await reportRepository.create(reportData);

      // Audit Log
      await AuditLog.create({
        userId: req.user?._id,
        campusId,
        action: isDraft ? 'DRAFT_CREATE' : 'TICKET_CREATE',
        ip: req.ip,
        details: `Ticket ID: ${ticketId}. Category: ${finalCategory}. Auto-Assigned: ${!!assignedTo}`,
      });

      if (!isDraft) {
        // System log comment
        const comment = new Comment({
          reportId: report._id,
          content: 'Incident reported successfully.',
          type: 'system_log',
          newValue: 'open',
        });
        await comment.save();

        // Notify campus resolvers room
        SocketService.notifyRoom(`campus_${campusId}`, 'new_report', ReportDTO.toResponse(report));
      }

      res.status(201).json({
        success: true,
        data: ReportDTO.toResponse(report),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List reports with multi-tenant safety, DTO mapping, and pagination filters
   */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.tenantId;
      if (!campusId && req.user?.role !== 'super-admin') {
        return next(new AppError('Campus context missing', 400, 'BAD_REQUEST'));
      }

      const {
        status,
        category,
        severity,
        assignedTo,
        search,
        isDraft = 'false',
        page = 1,
        limit = 10,
        sort = '-createdAt',
      } = req.query;

      const query: any = {};
      if (req.user?.role !== 'super-admin') {
        query.campusId = campusId;
      }

      if (status) query.status = status;
      if (category) query.category = category;
      if (severity) query.severity = severity;
      if (assignedTo) query.assignedTo = assignedTo;
      query.isDraft = isDraft === 'true';

      if (search) {
        query.$or = [
          { ticketId: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'location.building': { $regex: search, $options: 'i' } },
        ];
      }

      const skipIndex = (Number(page) - 1) * Number(limit);
      const totalDocs = await reportRepository.countReports(query);
      const docs = await reportRepository.findReports(query, sort as string, skipIndex, Number(limit));

      res.status(200).json({
        success: true,
        data: {
          reports: ReportDTO.toListResponse(docs),
          pagination: {
            total: totalDocs,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(totalDocs / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch single report detail
   */
  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await reportRepository.findById(id);

      if (!report) {
        return next(new AppError('Incident ticket not found', 404, 'NOT_FOUND'));
      }

      // Tenant isolation verification
      if (req.user?.role !== 'super-admin' && String(report.campusId) !== String(req.tenantId)) {
        return next(new AppError('Forbidden tenant access', 403, 'FORBIDDEN'));
      }

      // Populate reporter and resolver manually for DTO mappings compatibility
      const populatedReport = await report.populate([
        { path: 'reporter', select: 'name email role' },
        { path: 'assignedTo', select: 'name email role' },
      ]);

      res.status(200).json({
        success: true,
        data: ReportDTO.toResponse(populatedReport),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update report status or assignments
   */
  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, departmentId, assignedTo } = req.body;
      const userId = String(req.user?._id);
      const userName = req.user?.name || 'Staff';
      const userRole = req.user?.role || 'staff';

      const report = await reportRepository.findById(id);
      if (!report) return next(new AppError('Ticket not found', 404, 'NOT_FOUND'));

      // Tenant isolation
      if (req.user?.role !== 'super-admin' && String(report.campusId) !== String(req.tenantId)) {
        return next(new AppError('Forbidden tenant access', 403, 'FORBIDDEN'));
      }

      let updatedReport: any = report;

      if (status) {
        updatedReport = await ReportService.updateReportStatus(id, userId, userRole, userName, status);
      }

      if (departmentId || assignedTo) {
        updatedReport = await ReportService.assignReport(id, userId, userRole, userName, departmentId, assignedTo);
      }

      res.status(200).json({
        success: true,
        data: ReportDTO.toResponse(updatedReport),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vote / Upvote on reports
   */
  public static async upvote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = String(req.user?._id);

      const report = await ReportService.upvoteReport(id, userId);

      res.status(200).json({
        success: true,
        data: {
          upvotes: report.upvotes.length,
          hasUpvoted: report.upvotes.includes(userId as any),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add comments or internal notes
   */
  public static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content, isInternal } = req.body;
      const userId = String(req.user?._id);
      const userRole = req.user?.role || 'student';

      const report = await reportRepository.findById(id);
      if (!report) return next(new AppError('Ticket not found', 404, 'NOT_FOUND'));

      // Tenant checks
      if (req.user?.role !== 'super-admin' && String(report.campusId) !== String(req.tenantId)) {
        return next(new AppError('Forbidden tenant access', 403, 'FORBIDDEN'));
      }

      const finalInternal = isInternal && ['staff', 'campus-admin', 'super-admin'].includes(userRole);

      const comment = new Comment({
        reportId: report._id,
        author: userId,
        authorRole: userRole,
        content,
        isInternal: finalInternal,
        type: 'comment',
      });
      await comment.save();

      const populated = await Comment.findById(comment._id).populate('author', 'name role email');

      // Live discussion updates broadcast
      SocketService.notifyRoom(`ticket_${id}`, 'new_comment', { comment: populated });

      res.status(201).json({
        success: true,
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch discussion board comments
   */
  public static async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await reportRepository.findById(id);
      if (!report) return next(new AppError('Ticket not found', 404, 'NOT_FOUND'));

      // Tenant checks
      if (req.user?.role !== 'super-admin' && String(report.campusId) !== String(req.tenantId)) {
        return next(new AppError('Forbidden tenant access', 403, 'FORBIDDEN'));
      }

      const isStaffOrAdmin = ['staff', 'campus-admin', 'super-admin'].includes(req.user?.role || 'student');
      const query: any = { reportId: id };
      if (!isStaffOrAdmin) {
        query.isInternal = false;
      }

      const comments = await Comment.find(query)
        .populate('author', 'name role email')
        .sort('createdAt');

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search potential duplicate submissions (supports similarity indexes checks)
   */
  public static async duplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const campusId = req.tenantId;
      const { title, category, building } = req.query;

      if (!campusId || !title || !category || !building) {
        return next(new AppError('Missing query fields: title, category, building', 400, 'BAD_REQUEST'));
      }

      const duplicates = await AIService.detectDuplicates(
        String(campusId),
        String(title),
        String(category),
        String(building)
      );

      res.status(200).json({
        success: true,
        data: ReportDTO.toListResponse(duplicates),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merges a duplicate ticket into a main ticket (marks duplicate resolved/merged)
   */
  public static async merge(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceId, targetId } = req.body;
      const campusId = req.tenantId;

      const sourceReport = await reportRepository.findById(sourceId);
      const targetReport = await reportRepository.findById(targetId);

      if (!sourceReport || !targetReport) {
        return next(new AppError('Source or target report not found', 404, 'NOT_FOUND'));
      }

      // Enforce tenant checks
      if (String(sourceReport.campusId) !== String(campusId) || String(targetReport.campusId) !== String(campusId)) {
        return next(new AppError('Forbidden: Tenant bypass is blocked', 403, 'FORBIDDEN'));
      }

      // Perform Merge
      sourceReport.status = 'closed';
      sourceReport.mergedInto = targetReport._id as any;
      await sourceReport.save();

      // Log comments audit trail on both reports
      const sourceComment = new Comment({
        reportId: sourceReport._id,
        content: `This ticket has been marked as a duplicate and merged into Ticket ${targetReport.ticketId}.`,
        type: 'system_log',
      });
      await sourceComment.save();

      const targetComment = new Comment({
        reportId: targetReport._id,
        content: `Duplicate Ticket ${sourceReport.ticketId} has been merged into this ticket.`,
        type: 'system_log',
      });
      await targetComment.save();

      // Audit Log
      await AuditLog.create({
        userId: req.user?._id,
        campusId,
        action: 'TICKET_MERGE',
        details: `Merged ${sourceReport.ticketId} into ${targetReport.ticketId}`,
      });

      // Broadcast changes
      SocketService.notifyRoom(`ticket_${sourceId}`, 'status_updated', { reportId: sourceId, status: 'closed' });
      SocketService.notifyRoom(`ticket_${targetId}`, 'report_updated', { reportId: targetId });

      res.status(200).json({
        success: true,
        message: 'Tickets merged successfully',
        data: {
          source: ReportDTO.toResponse(sourceReport),
          target: ReportDTO.toResponse(targetReport),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft Delete a ticket
   */
  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await reportRepository.findById(id);

      if (!report) return next(new AppError('Ticket not found', 404, 'NOT_FOUND'));

      // Tenant check
      if (req.user?.role !== 'super-admin' && String(report.campusId) !== String(req.tenantId)) {
        return next(new AppError('Forbidden tenant access', 403, 'FORBIDDEN'));
      }

      // Soft delete
      await reportRepository.softDelete(id);

      // Audit Log
      await AuditLog.create({
        userId: req.user?._id,
        campusId: report.campusId,
        action: 'TICKET_DELETE',
        details: `Deleted ticket ID ${report.ticketId}`,
      });

      res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
export default ReportController;
