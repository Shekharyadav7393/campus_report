import express from 'express';
import {
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
} from '../controllers/adminController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); 
router.use(admin); 

router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.delete('/complaints/:id', deleteComplaint);

export default router;

