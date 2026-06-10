// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('../../../server/database/db.js', () => ({
  userDb: {
    getUserById: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { validateApiKey, authenticateToken, generateToken, authenticateWebSocket } from '../../../server/middleware/auth.js';
import { userDb } from '../../../server/database/db.js';

describe('auth middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    delete process.env.API_KEY;
  });

  describe('generateToken', () => {
    it('returns a JWT string with correct payload', () => {
      jwt.sign.mockReturnValue('mock-token');
      const token = generateToken({ id: 1, username: 'admin' });
      expect(token).toBe('mock-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, username: 'admin' },
        expect.any(String),
        { expiresIn: '24h' },
      );
    });
  });

  describe('validateApiKey', () => {
    it('calls next() when API_KEY env var is not set', () => {
      validateApiKey(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('calls next() when API_KEY matches x-api-key header', () => {
      process.env.API_KEY = 'secret123';
      mockReq.headers['x-api-key'] = 'secret123';
      validateApiKey(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 401 when API_KEY does not match', () => {
      process.env.API_KEY = 'secret123';
      mockReq.headers['x-api-key'] = 'wrong-key';
      validateApiKey(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when x-api-key header is missing', () => {
      process.env.API_KEY = 'secret123';
      validateApiKey(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authenticateToken', () => {
    it('returns 401 when no Authorization header is present', async () => {
      await authenticateToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when no token is provided', async () => {
      mockReq.headers['authorization'] = 'Bearer ';
      await authenticateToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('sets req.user and calls next() for a valid token', async () => {
      const decoded = { userId: 1, username: 'admin' };
      jwt.verify.mockReturnValue(decoded);
      userDb.getUserById.mockReturnValue({ id: 1, username: 'admin' });
      mockReq.headers['authorization'] = 'Bearer valid-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ id: 1, username: 'admin' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 401 when token is valid but user not found', async () => {
      jwt.verify.mockReturnValue({ userId: 999 });
      userDb.getUserById.mockReturnValue(undefined);
      mockReq.headers['authorization'] = 'Bearer valid-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 when token verification fails', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      mockReq.headers['authorization'] = 'Bearer bad-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 for expired token', async () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw expiredError; });
      mockReq.headers['authorization'] = 'Bearer expired-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authenticateWebSocket', () => {
    it('returns null when no token is provided', () => {
      expect(authenticateWebSocket(null)).toBeNull();
      expect(authenticateWebSocket(undefined)).toBeNull();
    });

    it('returns decoded payload for a valid token', () => {
      const decoded = { userId: 1, username: 'admin' };
      jwt.verify.mockReturnValue(decoded);
      expect(authenticateWebSocket('valid-token')).toEqual(decoded);
    });

    it('returns null for an invalid token', () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
      expect(authenticateWebSocket('bad-token')).toBeNull();
    });
  });
});
