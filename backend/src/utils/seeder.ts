import { Campus } from '../models/Campus.js';
import { Department } from '../models/Department.js';
import { logger } from './logger.js';

export async function seedDatabase() {
  try {
    const campusCount = await Campus.countDocuments();
    if (campusCount > 0) {
      logger.info('Database already has campus data. Skipping automatic seeding.');
      return;
    }

    logger.info('Database empty. Running automatic seeding of default campus tenants...');

    // 1. Seed Campuses
    const campusMit = await Campus.create({
      name: 'Massachusetts Institute of Technology',
      slug: 'mit',
      domain: 'mit.edu',
      settings: {
        primaryColor: '#a31d1d',
        allowedCategories: ['IT Support', 'Facility Maintenance', 'Security/Safety', 'Academic', 'Others'],
        slaHours: { low: 72, medium: 48, high: 24, critical: 4 },
      },
    });

    const campusHarvard = await Campus.create({
      name: 'Harvard University',
      slug: 'harvard',
      domain: 'harvard.edu',
      settings: {
        primaryColor: '#291b1b',
        allowedCategories: ['IT Support', 'Facility Maintenance', 'Security/Safety', 'Academic', 'Others'],
        slaHours: { low: 72, medium: 48, high: 24, critical: 4 },
      },
    });

    logger.info(`Campuses seeded successfully: ${campusMit.name}, ${campusHarvard.name}`);

    // 2. Seed default departments for each campus
    const campuses = [campusMit, campusHarvard];
    for (const campus of campuses) {
      await Department.create([
        {
          name: 'IT Support Services',
          campusId: campus._id,
        },
        {
          name: 'Facility Maintenance & Grounds',
          campusId: campus._id,
        },
        {
          name: 'Campus Security & Emergency Safety',
          campusId: campus._id,
        },
        {
          name: 'Academic Affairs Admin',
          campusId: campus._id,
        },
      ]);
    }

    logger.info('Default departments seeded successfully for all campus tenants.');
  } catch (error) {
    logger.error(`Database seeding failed: ${error}`);
  }
}
