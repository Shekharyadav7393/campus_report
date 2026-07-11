import { Router } from 'express';
import { NoticeController } from '../controllers/notice.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createNoticeSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate); // Require authentication for all notice endpoints

router.get('/', NoticeController.list);
router.post(
  '/',
  authorize('super-admin', 'campus-admin', 'staff'),
  validate(createNoticeSchema),
  NoticeController.create
);
router.delete('/:id', authorize('super-admin', 'campus-admin'), NoticeController.delete);

export default router;
