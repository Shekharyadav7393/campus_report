import express from 'express';
import {
  createComplaint,
  getMyComplaints,
  getComplaint,
} from '../controllers/complaintController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); 

router.route('/').post(createComplaint).get(getMyComplaints);
router.route('/:id').get(getComplaint);

export default router;

