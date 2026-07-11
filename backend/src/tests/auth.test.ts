import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from '../app.js';
import { Campus } from '../models/Campus.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

dotenv.config();

// Mock Mongoose Connection Network Calls
jest.spyOn(mongoose, 'connect').mockResolvedValue(null as any);
jest.spyOn(mongoose.connection, 'close').mockResolvedValue(null as any);

describe('Auth API Integration Tests', () => {
  let testCampusId = '65f1c97a5db229158c353f47';
  let testUserEmail = 'test_student@testuni.edu';

  beforeAll(() => {
    // Mock db cleanups and audit log creations
    jest.spyOn(User, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
    jest.spyOn(Campus, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
    jest.spyOn(Campus, 'deleteOne').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
    jest.spyOn(AuditLog, 'create').mockResolvedValue({} as any);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a new user under seed campus successfully', async () => {
      // Mock finding Campus
      jest.spyOn(Campus, 'findById').mockResolvedValue({
        _id: testCampusId,
        name: 'Test University',
        slug: 'test-uni-slug',
        domain: 'testuni.edu',
        settings: {
          primaryColor: '#3b82f6',
          allowedCategories: ['IT Helpdesk', 'Facilities'],
          slaHours: { low: 72, medium: 48, high: 24, critical: 4 }
        }
      } as any);

      // Mock User email availability
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      // Mock save User
      jest.spyOn(User.prototype, 'save').mockResolvedValue({
        _id: '65f1c99f5db229158c353f4d',
        name: 'Test Student',
        email: testUserEmail,
        role: 'student',
        campusId: testCampusId,
        isVerified: true,
        sessions: [],
        createdAt: new Date()
      } as any);

      // Mock registerSession
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Test Student',
          email: testUserEmail,
          password: 'securePassword123',
          role: 'student',
          campusId: testCampusId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should block registration if email already exists', async () => {
      // Mock finding Campus
      jest.spyOn(Campus, 'findById').mockResolvedValue({ _id: testCampusId } as any);

      // Mock User already exists
      jest.spyOn(User, 'findOne').mockResolvedValue({ _id: 'some_id' } as any);

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Another Student',
          email: testUserEmail,
          password: 'securePassword123',
          role: 'student',
          campusId: testCampusId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should fail validation with invalid payload parameters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'T',
          email: 'invalid-email',
          password: '123',
          role: 'hacker',
          campusId: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in the created student and return token', async () => {
      // Mock finding user with matching credentials
      jest.spyOn(User, 'findOne').mockResolvedValue({
        _id: '65f1c99f5db229158c353f4d',
        name: 'Test Student',
        email: testUserEmail,
        passwordHash: '$2a$10$abcdefghijklmnopqrstub', // mock hash
        role: 'student',
        campusId: testCampusId,
        isVerified: true,
        status: 'active',
        sessions: [],
        createdAt: new Date()
      } as any);

      // Mock password match checks
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Mock session update
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'securePassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should block login with wrong password credentials', async () => {
      // Mock finding user
      jest.spyOn(User, 'findOne').mockResolvedValue({
        _id: '65f1c99f5db229158c353f4d',
        email: testUserEmail,
        passwordHash: 'hash',
        role: 'student',
        status: 'active'
      } as any);

      // Mock password check failure
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
