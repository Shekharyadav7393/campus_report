import { BaseRepository } from './base.repository.js';
import { Report, IReport } from '../models/Report.js';
import { FilterQuery } from 'mongoose';

export class ReportRepository extends BaseRepository<IReport> {
  constructor() {
    super(Report);
  }

  /**
   * Fetch a single ticket by ticket ID (e.g. MIT-1002)
   */
  public async findByTicketId(ticketId: string): Promise<IReport | null> {
    return this.findOne({ ticketId: ticketId.toUpperCase() });
  }

  /**
   * Query matching tenant reports with parameters filtering and pagination
   */
  public async findReports(
    query: FilterQuery<IReport>,
    sort: string = '-createdAt',
    skip: number = 0,
    limit: number = 10
  ): Promise<IReport[]> {
    return this.model.find({ isDeleted: { $ne: true }, ...query })
      .populate('reporter', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('departmentId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  /**
   * Count total reports matching query parameters
   */
  public async countReports(query: FilterQuery<IReport>): Promise<number> {
    return this.model.countDocuments({ isDeleted: { $ne: true }, ...query });
  }
}

export const reportRepository = new ReportRepository();
