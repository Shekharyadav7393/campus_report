import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticate); // Require authentication for all department operations

router.get('/', DepartmentController.list);
router.post('/', authorize('super-admin', 'campus-admin'), DepartmentController.create);
router.get('/staff', authorize('super-admin', 'campus-admin', 'staff'), DepartmentController.listStaff);

export default router;
