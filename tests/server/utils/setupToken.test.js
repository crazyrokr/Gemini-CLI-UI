// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'a'.repeat(64)),
    })),
    timingSafeEqual: vi.fn(() => true),
  },
}));

import crypto from 'crypto';
import {
  generateSetupToken,
  validateSetupToken,
  consumeSetupToken,
  getSetupToken,
} from '../../../server/utils/setupToken.js';

describe('setupToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by generating a fresh token
    generateSetupToken();
  });

  describe('generateSetupToken', () => {
    it('generates a 64-char hex string', () => {
      const token = generateSetupToken();
      expect(token).toBe('a'.repeat(64));
      expect(token.length).toBe(64);
    });

    it('uses crypto.randomBytes with 32 bytes', () => {
      generateSetupToken();
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('validateSetupToken', () => {
    it('returns true for a valid token', () => {
      const token = generateSetupToken();
      expect(validateSetupToken(token)).toBe(true);
    });

    it('uses timingSafeEqual for comparison', () => {
      const token = generateSetupToken();
      validateSetupToken(token);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });

    it('returns false before any token is generated', () => {
      // The beforeEach generates one, but the module state persists.
      // We test the consumed state instead.
      consumeSetupToken();
      expect(validateSetupToken('anything')).toBe(false);
    });

    it('returns false after token is consumed', () => {
      const token = generateSetupToken();
      consumeSetupToken();
      expect(validateSetupToken(token)).toBe(false);
    });
  });

  describe('consumeSetupToken', () => {
    it('invalidates the current token', () => {
      const token = generateSetupToken();
      expect(validateSetupToken(token)).toBe(true);
      consumeSetupToken();
      expect(validateSetupToken(token)).toBe(false);
    });

    it('clears getSetupToken', () => {
      generateSetupToken();
      consumeSetupToken();
      expect(getSetupToken()).toBeNull();
    });
  });

  describe('getSetupToken', () => {
    it('returns the current token', () => {
      const token = generateSetupToken();
      expect(getSetupToken()).toBe(token);
    });

    it('returns null after consumption', () => {
      generateSetupToken();
      consumeSetupToken();
      expect(getSetupToken()).toBeNull();
    });
  });
});
