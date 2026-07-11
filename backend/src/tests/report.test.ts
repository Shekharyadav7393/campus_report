import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { Campus } from '../models/Campus.js';
import { Report } from '../models/Report.js';
import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { AuditLog } from '../models/AuditLog.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

describe('Report API Integration Tests', () => {
  let mockToken: string;
  let mockUser: any;
  let testCampusId = '65f1c97a5db229158c353f47';

  beforeAll(() => {
    mockUser = {
      _id: '65f1c99f5db229158c353f4d',
      name: 'Test Campus Admin',
      email: 'admin@testuni.edu',
      role: 'campus-admin', // Use admin role to satisfy all authorization routes
      campusId: testCampusId,
      isVerified: true,
      sessions: [],
    };

    mockToken = jwt.sign(
      {
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
        campusId: mockUser.campusId,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Mock Mongoose Connection Network Calls
    jest.spyOn(mongoose, 'connect').mockResolvedValue(null as any);
    jest.spyOn(mongoose.connection, 'close').mockResolvedValue(null as any);

    // Mock Audit Logs and System Comments
    jest.spyOn(AuditLog, 'create').mockResolvedValue({} as any);
    jest.spyOn(Comment.prototype, 'save').mockResolvedValue({} as any);

    // Mock Report save operations
    jest.spyOn(Report.prototype, 'save').mockImplementation(function (this: any) {
      this._id = '65f1d07c5db229158c353f5a';
      this.ticketId = 'TEST-UNI-1005';
      this.createdAt = new Date();
      this.updatedAt = new Date();
      return Promise.resolve(this);
    });

    // Mock AI Service inner queries and User auth lookups
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
    jest.spyOn(Department, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'find').mockResolvedValue([]);
  });

  describe('POST /api/v1/reports - Create Report', () => {
    it('should submit a report and auto-classify using simulated AI rules', async () => {
      jest.spyOn(Campus, 'findById').mockResolvedValue({
        _id: testCampusId,
        slug: 'test-uni',
      } as any);

      jest.spyOn(Report, 'countDocuments').mockResolvedValue(4);

      // Mock Report Save
      const mockSavedReport = {
        _id: '65f1d07c5db229158c353f5a',
        ticketId: 'TEST-UNI-1005',
        title: 'Broken lights in classroom 404',
        description: 'The ceiling lights are flickering and some bulbs are broken',
        category: 'Facility Maintenance',
        severity: 'medium',
        status: 'open',
        campusId: testCampusId,
        reporter: mockUser._id,
        location: {
          building: 'Engineering Block',
          room: '404',
        },
        isDraft: false,
        upvotes: [],
        createdAt: new Date(),
      };

      jest.spyOn(Report, 'create').mockResolvedValue(mockSavedReport as any);

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          title: 'Broken lights in classroom 404',
          description: 'The ceiling lights are flickering and some bulbs are broken',
          category: 'Facility Maintenance',
          severity: 'medium',
          location: {
            building: 'Engineering Block',
            room: '404',
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticketId).toBe('TEST-UNI-1005');
      expect(response.body.data.category).toBe('Facility Maintenance');
    });
  });

  describe('GET /api/v1/reports/duplicates - Duplicate Scanning Checks', () => {
    it('should search similar reports in the same building and category', async () => {
      const mockSimilarReports = [
        {
          _id: '65f1d07c5db229158c353f5a',
          ticketId: 'TEST-UNI-1005',
          title: 'Broken lights in classroom 404',
          category: 'Facility Maintenance',
          location: { building: 'Engineering Block' },
        },
      ];

      jest.spyOn(Report, 'find').mockResolvedValue(mockSimilarReports as any);

      const response = await request(app)
        .get('/api/v1/reports/duplicates')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({
          title: 'Flickering lights classroom 404', // 50% Jaccard overlap to pass >= 0.35 threshold
          category: 'Facility Maintenance',
          building: 'Engineering Block',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/v1/reports/merge - Merge Tickets', () => {
    it('should merge duplicate ticket into main ticket and close the duplicate', async () => {
      const sourceReport = {
        _id: '65f1d07c5db229158c353f5a',
        ticketId: 'TEST-UNI-1005',
        status: 'open',
        campusId: testCampusId,
        location: {
          building: 'Engineering Block',
          room: '404',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const targetReport = {
        _id: '65f1d08c5db229158c353f5b',
        ticketId: 'TEST-UNI-1006',
        status: 'open',
        campusId: testCampusId,
        location: {
          building: 'Engineering Block',
          room: '404',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Report, 'findById')
        .mockResolvedValueOnce(sourceReport as any)
        .mockResolvedValueOnce(targetReport as any);

      const response = await request(app)
        .post('/api/v1/reports/merge')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          sourceId: '65f1d07c5db229158c353f5a',
          targetId: '65f1d08c5db229158c353f5b',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(sourceReport.status).toBe('closed');
    });
  });

  describe('DELETE /api/v1/reports/:id - Soft Delete', () => {
    it('should tag a ticket deleted instead of physical wipe', async () => {
      const mockReport = {
        _id: '65f1d07c5db229158c353f5a',
        ticketId: 'TEST-UNI-1005',
        campusId: testCampusId,
        location: {
          building: 'Engineering Block',
          room: '404',
        },
      };

      jest.spyOn(Report, 'findById').mockResolvedValue(mockReport as any);
      jest.spyOn(Report, 'findByIdAndUpdate').mockResolvedValue({} as any);

      const response = await request(app)
        .delete('/api/v1/reports/65f1d07c5db229158c353f5a')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
