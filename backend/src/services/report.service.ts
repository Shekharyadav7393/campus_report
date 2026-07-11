import { Report, IReport, ReportSeverity, ReportStatus } from '../models/Report.js';
import { Campus } from '../models/Campus.js';
import { Comment } from '../models/Comment.js';
import { AppError } from '../utils/AppError.js';
import { SocketService } from './socket.service.js';

export class ReportService {
  /**
   * Create a new report ticket
   */
  public static async createReport(
    reporterId: string | undefined,
    campusId: string,
    data: Partial<IReport>
  ): Promise<IReport> {
    const campus = await Campus.findById(campusId);
    if (!campus) {
      throw new AppError('Campus not found', 404, 'CAMPUS_NOT_FOUND');
    }

    // Generate ticketId (e.g. MIT-1002)
    const reportCount = await Report.countDocuments({ campusId });
    const formattedSlug = campus.slug.toUpperCase();
    const ticketId = `${formattedSlug}-${1001 + reportCount}`;

    // Calculate SLA deadline
    const severity: ReportSeverity = data.severity || 'low';
    const slaHours = campus.settings.slaHours[severity] || 48;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const report = new Report({
      ...data,
      ticketId,
      campusId,
      reporter: data.anonymous ? undefined : reporterId,
      slaDeadline,
      subscribers: reporterId ? [reporterId] : [], // Author subscribes automatically
    });

    const savedReport = await report.save();

    // Trigger System Log Comment
    const log = new Comment({
      reportId: savedReport._id,
      content: 'Ticket created and marked as Open.',
      type: 'system_log',
      newValue: 'open',
      isInternal: false,
    });
    await log.save();

    // Notify campus resolvers & subscribers
    SocketService.notifyRoom(`campus_${campusId}`, 'new_report', {
      ticketId: savedReport.ticketId,
      title: savedReport.title,
      category: savedReport.category,
      severity: savedReport.severity,
    });

    return savedReport;
  }

  /**
   * Update report status and log activity
   */
  public static async updateReportStatus(
    reportId: string,
    updaterId: string,
    updaterRole: string,
    updaterName: string,
    newStatus: ReportStatus
  ): Promise<IReport> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const oldStatus = report.status;
    if (oldStatus === newStatus) {
      return report;
    }

    report.status = newStatus;
    if (newStatus === 'resolved') {
      report.resolvedAt = new Date();
    }

    const updatedReport = await report.save();

    // Log the change
    const comment = new Comment({
      reportId: report._id,
      author: updaterId,
      authorRole: updaterRole,
      content: `${updaterName} changed status from '${oldStatus}' to '${newStatus}'.`,
      type: 'status_change',
      oldValue: oldStatus,
      newValue: newStatus,
      isInternal: false,
    });
    await comment.save();

    // Notify sockets
    SocketService.notifyRoom(`ticket_${reportId}`, 'status_updated', {
      reportId,
      status: newStatus,
      comment: comment.content,
    });

    // Notify campus dashboard of update
    SocketService.notifyRoom(`campus_${report.campusId}`, 'report_updated', {
      reportId,
      status: newStatus,
    });

    return updatedReport;
  }

  /**
   * Assign a report to a department or staff member
   */
  public static async assignReport(
    reportId: string,
    updaterId: string,
    updaterRole: string,
    updaterName: string,
    departmentId?: string,
    staffId?: string
  ): Promise<IReport> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    let logs: string[] = [];

    if (departmentId && String(report.departmentId) !== departmentId) {
      report.departmentId = departmentId as any;
      logs.push('Assigned to new department');
    }

    if (staffId && String(report.assignedTo) !== staffId) {
      report.assignedTo = staffId as any;
      logs.push(`Assigned to resolver`);
    }

    if (logs.length > 0) {
      const updatedReport = await report.save();

      const comment = new Comment({
        reportId: report._id,
        author: updaterId,
        authorRole: updaterRole,
        content: `${updaterName} updated assignment: ${logs.join(', ')}.`,
        type: 'assignment_change',
        isInternal: true, // Internal assignment logs visible to resolvers/admins
      });
      await comment.save();

      SocketService.notifyRoom(`ticket_${reportId}`, 'assignment_updated', {
        reportId,
        departmentId,
        assignedTo: staffId,
      });

      return updatedReport;
    }

    return report;
  }

  /**
   * Find potential duplicates based on building, category, and creation date (within 5 days)
   */
  public static async checkDuplicates(
    campusId: string,
    category: string,
    building: string
  ): Promise<IReport[]> {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    return Report.find({
      campusId,
      category,
      'location.building': { $regex: new RegExp(`^${building}$`, 'i') },
      status: { $in: ['open', 'under-review', 'in-progress'] },
      createdAt: { $gte: fiveDaysAgo },
    });
  }

  /**
   * Add an upvote to a report
   */
  public static async upvoteReport(reportId: string, userId: string): Promise<IReport> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    // Toggle upvote
    const upvoteIdx = report.upvotes.indexOf(userId as any);
    if (upvoteIdx === -1) {
      report.upvotes.push(userId as any);
    } else {
      report.upvotes.splice(upvoteIdx, 1);
    }

    return report.save();
  }
}
