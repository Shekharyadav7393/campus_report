import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReportSchema, updateReportSchema, createCommentSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate); // Require authentication for all report pathways

router.post('/', validate(createReportSchema), ReportController.create);
router.get('/', ReportController.list);
router.get('/duplicates', ReportController.duplicates);
router.get('/:id', ReportController.getById);

// Administrative controls
router.put('/:id', authorize('super-admin', 'campus-admin', 'staff'), validate(updateReportSchema), ReportController.update);
router.post('/merge', authorize('super-admin', 'campus-admin', 'staff'), ReportController.merge);
router.delete('/:id', authorize('super-admin', 'campus-admin'), ReportController.delete);

// Upvotes and comments
router.post('/:id/upvote', ReportController.upvote);
router.post('/:id/comments', validate(createCommentSchema), ReportController.addComment);
router.get('/:id/comments', ReportController.listComments);

export default router;
