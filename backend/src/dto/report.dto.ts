import { IReport } from '../models/Report.js';

export interface ReportResponseDTO {
  id: string;
  ticketId: string;
  reporter?: {
    id: string;
    name: string;
    role: string;
  };
  anonymous: boolean;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  campusId: string;
  departmentId?: string;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
  };
  location: {
    building: string;
    room?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  attachments: string[];
  upvotesCount: number;
  subscribersCount: number;
  slaDeadline?: string;
  isBreached: boolean;
  resolvedAt?: string;
  isDraft: boolean;
  mergedInto?: string;
  createdAt: string;
  updatedAt: string;
}

export class ReportDTO {
  public static toResponse(report: IReport): ReportResponseDTO {
    const now = new Date();
    const isBreached = 
      report.slaDeadline && 
      now > report.slaDeadline && 
      !['resolved', 'rejected', 'closed'].includes(report.status);

    return {
      id: String(report._id),
      ticketId: report.ticketId,
      reporter: report.anonymous || !report.reporter
        ? undefined
        : {
            id: String((report.reporter as any)._id || report.reporter),
            name: (report.reporter as any).name || 'Reporter',
            role: (report.reporter as any).role || 'user',
          },
      anonymous: report.anonymous,
      title: report.title,
      description: report.description,
      category: report.category,
      severity: report.severity,
      status: report.status,
      campusId: String(report.campusId),
      departmentId: report.departmentId ? String(report.departmentId) : undefined,
      assignedTo: report.assignedTo
        ? {
            id: String((report.assignedTo as any)._id || report.assignedTo),
            name: (report.assignedTo as any).name || 'Resolver',
            role: (report.assignedTo as any).role || 'staff',
          }
        : undefined,
      location: {
        building: report.location.building,
        room: report.location.room,
        coordinates: report.location.coordinates,
      },
      attachments: report.attachments,
      upvotesCount: report.upvotes?.length || 0,
      subscribersCount: report.subscribers?.length || 0,
      slaDeadline: report.slaDeadline?.toISOString(),
      isBreached: !!isBreached,
      resolvedAt: report.resolvedAt?.toISOString(),
      isDraft: report.isDraft,
      mergedInto: report.mergedInto ? String(report.mergedInto) : undefined,
      createdAt: report.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: report.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  public static toListResponse(reports: IReport[]): ReportResponseDTO[] {
    return reports.map((r) => this.toResponse(r));
  }
}
