import { BaseRepository } from './base.repository.js';
import { Campus, ICampus } from '../models/Campus.js';

export class CampusRepository extends BaseRepository<ICampus> {
  constructor() {
    super(Campus);
  }

  /**
   * Fetch a campus by its unique slug
   */
  public async findBySlug(slug: string): Promise<ICampus | null> {
    return this.findOne({ slug: slug.toLowerCase() });
  }

  /**
   * Fetch a campus matching a specific domain string
   */
  public async findByDomain(domain: string): Promise<ICampus | null> {
    return this.findOne({ domain: domain.toLowerCase() });
  }
}

export const campusRepository = new CampusRepository();
