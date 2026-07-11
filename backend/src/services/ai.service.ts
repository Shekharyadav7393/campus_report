import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { logger } from '../utils/logger.js';

export interface AISuggestion {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AIService {
  /**
   * Classifies a ticket's category and severity using lightweight NLP matching
   */
  public static classifyTicket(title: string, description: string): AISuggestion {
    const text = `${title} ${description}`.toLowerCase();

    // 1. Determine Category
    let category = 'Others';
    if (/\b(wifi|wi-fi|internet|server|login|email|credentials|password|printer|software|pc|computer|network)\b/i.test(text)) {
      category = 'IT Support';
    } else if (/\b(elevator|lift|leak|toilet|door|window|pipe|ac|heater|light|bulb|broken|wall|ceiling|facilities|ventilation)\b/i.test(text)) {
      category = 'Facility Maintenance';
    } else if (/\b(theft|stolen|robbery|wallet|keys|phone|bag|lost|found|laptop|charger|glasses)\b/i.test(text)) {
      category = 'Lost & Found';
    } else if (/\b(danger|weapon|fire|smoke|fight|assault|harassment|trespass|intruder|police|security|guard|alarm|emergency|bystander)\b/i.test(text)) {
      category = 'Security/Safety';
    } else if (/\b(grade|exam|professor|class|registration|transcript|academic|syllabus|course|enrollment)\b/i.test(text)) {
      category = 'Academic';
    }

    // 2. Determine Severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (/\b(fire|weapon|bomb|immediate|severe|heart attack|choking|unconscious|bleeding|explosion|collapsed)\b/i.test(text)) {
      severity = 'critical';
    } else if (/\b(broken pipe|leakage|flooding|no electricity|blackout|theft|assault|harassment|broken lock|broken elevator)\b/i.test(text)) {
      severity = 'high';
    } else if (/\b(ac not working|no internet|login issues|lost item|exam schedule conflict)\b/i.test(text)) {
      severity = 'medium';
    }

    return { category, severity };
  }

  /**
   * Calculate string Jaccard similarity score (words overlap check)
   */
  private static getSimilarity(str1: string, str2: string): number {
    const s1 = new Set(str1.toLowerCase().split(/\s+/));
    const s2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Scans campus databases for duplicate tickets within same building & category
   */
  public static async detectDuplicates(
    campusId: string,
    title: string,
    category: string,
    building: string
  ): Promise<any[]> {
    try {
      // Fetch open reports in same building and category
      const reports = await Report.find({
        campusId,
        category,
        'location.building': { $regex: new RegExp(`^${building}$`, 'i') },
        status: { $in: ['open', 'under-review', 'in-progress'] },
        isDeleted: false,
      });

      const duplicates = reports
        .map((r) => {
          const score = this.getSimilarity(title, r.title);
          return { report: r, score };
        })
        .filter((item) => item.score >= 0.35) // 35% overlap thresholds
        .sort((a, b) => b.score - a.score)
        .map((item) => item.report);

      return duplicates;
    } catch (e) {
      logger.error(`AI Duplicate detection error: ${e}`);
      return [];
    }
  }

  /**
   * Assigns ticket to department head or staff member with the lowest active ticket load
   */
  public static async recommendResolver(campusId: string, category: string): Promise<string | undefined> {
    try {
      // 1. Locate matching department
      // We search for a department whose name contains the category string
      const dept = await Department.findOne({
        campusId,
        name: { $regex: new RegExp(category.split(' ')[0] || category, 'i') },
      });

      if (!dept) {
        logger.debug(`No department found for category ${category}. Skipping auto-assignment.`);
        return undefined;
      }

      // 2. Fetch staff members in this department
      const staffList = await User.find({
        campusId,
        departmentId: dept._id,
        role: 'staff',
        status: 'active',
        isDeleted: false,
      });

      if (staffList.length === 0) {
        // Fallback to department head if no staff
        return dept.head ? String(dept.head) : undefined;
      }

      // 3. Find staff member with lowest load (active tickets: open, under-review, in-progress)
      let bestResolverId: string | undefined;
      let lowestLoad = Infinity;

      for (const staff of staffList) {
        const activeCount = await Report.countDocuments({
          campusId,
          assignedTo: staff._id,
          status: { $in: ['open', 'under-review', 'in-progress'] },
          isDeleted: false,
        });

        if (activeCount < lowestLoad) {
          lowestLoad = activeCount;
          bestResolverId = String(staff._id);
        }
      }

      return bestResolverId;
    } catch (e) {
      logger.error(`AI auto-assignment calculation error: ${e}`);
      return undefined;
    }
  }
}
