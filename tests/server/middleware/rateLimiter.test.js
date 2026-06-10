// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../../../server/middleware/rateLimiter.js';

describe('createRateLimiter', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.useFakeTimers();
    mockReq = { ip: '127.0.0.1', connection: { remoteAddress: '127.0.0.1' } };
    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls next() when under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 429 when limit is exceeded', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

    limiter(mockReq, mockRes, mockNext); // request 1
    limiter(mockReq, mockRes, mockNext); // request 2
    limiter(mockReq, mockRes, mockNext); // request 3 — should be blocked

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Too many requests') })
    );
  });

  it('sets X-RateLimit headers on each request', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    limiter(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });

  it('resets the counter after the window expires', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter(mockReq, mockRes, mockNext); // request 1 — allowed
    limiter(mockReq, mockRes, mockNext); // request 2 — blocked
    expect(mockRes.status).toHaveBeenCalledWith(429);

    vi.advanceTimersByTime(1001);
    mockRes.status.mockClear();

    limiter(mockReq, mockRes, mockNext); // request 3 — allowed again
    expect(mockNext).toHaveBeenCalledTimes(2); // first + this one
  });

  it('tracks IPs independently', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

    const req1 = { ip: '192.168.1.1', connection: { remoteAddress: '192.168.1.1' } };
    const req2 = { ip: '192.168.1.2', connection: { remoteAddress: '192.168.1.2' } };

    limiter(req1, mockRes, mockNext);
    limiter(req2, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(2); // both allowed
  });

  it('counts remaining requests correctly', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3 });

    limiter(mockReq, mockRes, mockNext); // remaining: 2
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);

    limiter(mockReq, mockRes, mockNext); // remaining: 1
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);

    limiter(mockReq, mockRes, mockNext); // remaining: 0
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  it('does not show negative remaining count', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

    limiter(mockReq, mockRes, mockNext); // uses the only slot
    limiter(mockReq, mockRes, mockNext); // blocked

    // The blocked request should still show remaining as 0 (clamped)
    const remainingCalls = mockRes.setHeader.mock.calls.filter(
      c => c[0] === 'X-RateLimit-Remaining'
    );
    const lastRemaining = remainingCalls[remainingCalls.length - 1][1];
    expect(lastRemaining).toBeGreaterThanOrEqual(0);
  });
});
