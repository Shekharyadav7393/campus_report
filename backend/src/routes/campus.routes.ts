import { Router } from 'express';
import { CampusController } from '../controllers/campus.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createCampusSchema } from '../utils/validators.js';

const router = Router();

// Public endpoints
router.get('/', CampusController.listCampuses);
router.get('/slug/:slug', CampusController.getCampusBySlug);

// Tenant administrative endpoints
router.post(
  '/',
  authenticate,
  authorize('super-admin'),
  validate(createCampusSchema),
  CampusController.createCampus
);

router.put(
  '/:id',
  authenticate,
  authorize('super-admin', 'campus-admin'),
  CampusController.updateCampusSettings
);

export default router;
