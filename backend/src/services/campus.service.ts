import { Campus, ICampus } from '../models/Campus.js';
import { AppError } from '../utils/AppError.js';

export class CampusService {
  /**
   * Create a new campus tenant
   */
  public static async createCampus(data: Partial<ICampus>): Promise<ICampus> {
    const existing = await Campus.findOne({ slug: data.slug });
    if (existing) {
      throw new AppError(`Campus with slug '${data.slug}' already exists.`, 400, 'DUPLICATE_SLUG');
    }

    const campus = new Campus(data);
    return campus.save();
  }

  /**
   * Fetch all registered campuses (restricted/public version)
   */
  public static async getAllCampuses(): Promise<ICampus[]> {
    return Campus.find({}, 'name slug domain settings.primaryColor');
  }

  /**
   * Get campus by slug
   */
  public static async getCampusBySlug(slug: string): Promise<ICampus> {
    const campus = await Campus.findOne({ slug });
    if (!campus) {
      throw new AppError('Campus not found', 404, 'CAMPUS_NOT_FOUND');
    }
    return campus;
  }

  /**
   * Check if a user's email matches the campus domain
   */
  public static isDomainMatching(email: string, campusDomain?: string): boolean {
    if (!campusDomain) return false;
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return emailDomain === campusDomain.toLowerCase();
  }
}
