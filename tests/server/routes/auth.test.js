// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

process.env.JWT_SECRET = 'a'.repeat(32);

vi.mock('../../../server/database/db.js', () => ({
  userDb: {
    hasUsers: vi.fn(),
    createUser: vi.fn(),
    getUserByUsername: vi.fn(),
    updateLastLogin: vi.fn(),
    getUserById: vi.fn(),
  },
  initializeDatabase: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../server/middleware/auth.js', () => {
  return {
    generateToken: vi.fn().mockReturnValue('mock-jwt-token'),
    authenticateToken: (req, res, next) => {
      if (req.headers['authorization'] === 'Bearer valid-token') {
        req.user = { id: 1, username: 'admin' };
        return next();
      }
      return res.status(401).json({ error: 'Access denied' });
    },
  };
});

vi.mock('../../../server/middleware/rateLimiter.js', () => ({
  createRateLimiter: () => (req, res, next) => next(),
}));

vi.mock('../../../server/utils/setupToken.js', () => ({
  validateSetupToken: vi.fn().mockReturnValue(true),
  consumeSetupToken: vi.fn(),
  generateSetupToken: vi.fn().mockReturnValue('mock-setup-token'),
  getSetupToken: vi.fn().mockReturnValue('mock-setup-token'),
}));

import { userDb } from '../../../server/database/db.js';
import bcrypt from 'bcrypt';
import authRoutes from '../../../server/routes/auth.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /status', () => {
    it('returns needsSetup: true when no users exist', async () => {
      userDb.hasUsers.mockResolvedValue(false);
      const app = createApp();
      const res = await supertest(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.needsSetup).toBe(true);
    });

    it('returns needsSetup: false when users exist', async () => {
      userDb.hasUsers.mockResolvedValue(true);
      const app = createApp();
      const res = await supertest(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.needsSetup).toBe(false);
    });
  });

  describe('POST /register', () => {
    it('registers a new user when no users exist with valid setup token', async () => {
      userDb.hasUsers.mockReturnValue(false);
      userDb.createUser.mockReturnValue({ id: 1, username: 'admin' });

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .set('x-setup-token', 'mock-setup-token')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('mock-jwt-token');
      expect(res.body.user.username).toBe('admin');
    });

    it('returns 403 when a user already exists', async () => {
      userDb.hasUsers.mockReturnValue(true);

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('already exists');
    });

    it('returns 403 when setup token is missing on initial registration', async () => {
      userDb.hasUsers.mockReturnValue(false);

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('setup token');
    });

    it('returns 400 when username is missing', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when username is too short', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'ab', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'admin', password: '12345' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /login', () => {
    it('logs in with correct credentials', async () => {
      userDb.getUserByUsername.mockReturnValue({ id: 1, username: 'admin', password_hash: '$2b$12$hash' });
      bcrypt.compare.mockResolvedValue(true);

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('mock-jwt-token');
    });

    it('returns 401 for non-existent user', async () => {
      userDb.getUserByUsername.mockReturnValue(undefined);

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for wrong password', async () => {
      userDb.getUserByUsername.mockReturnValue({ id: 1, username: 'admin', password_hash: '$2b$12$hash' });
      bcrypt.compare.mockResolvedValue(false);

      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when username is missing', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /user', () => {
    it('returns user data with valid token', async () => {
      const app = createApp();
      const res = await supertest(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });

    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await supertest(app).get('/api/auth/user');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const app = createApp();
      const res = await supertest(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('returns success with valid token', async () => {
      const app = createApp();
      const res = await supertest(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await supertest(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
