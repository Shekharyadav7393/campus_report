import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/dashboard-stats',
  authenticate,
  authorize('super-admin', 'campus-admin', 'staff'),
  AnalyticsController.getDashboardStats
);

export default router;
