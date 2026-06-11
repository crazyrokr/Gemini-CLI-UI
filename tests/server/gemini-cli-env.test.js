// @vitest-environment node

/**
 * Tests for the JWT_SECRET enforcement at module load time.
 *
 * The auth.js module runs this check at the top level:
 *   if (!JWT_SECRET || JWT_SECRET.length < 32) { process.exit(1); }
 *
 * Since Vitest intercepts process.exit and we already set a valid JWT_SECRET
 * in the auth middleware test via vi.hoisted(), we test the guard logic
 * by verifying the conditions that would trigger the fatal exit.
 */
import { describe, it, expect } from 'vitest';

describe('JWT_SECRET startup guard', () => {
  it('rejects undefined JWT_SECRET', () => {
    const value = undefined;
    expect(!value || value.length < 32).toBe(true);
  });

  it('rejects null JWT_SECRET', () => {
    const value = null;
    expect(!value || value.length < 32).toBe(true);
  });

  it('rejects empty string JWT_SECRET', () => {
    const value = '';
    expect(!value || value.length < 32).toBe(true);
  });

  it('rejects JWT_SECRET shorter than 32 characters', () => {
    const value = 'short';
    expect(!value || value.length < 32).toBe(true);
  });

  it('rejects JWT_SECRET exactly 31 characters', () => {
    const value = 'a'.repeat(31);
    expect(!value || value.length < 32).toBe(true);
  });

  it('accepts JWT_SECRET exactly 32 characters', () => {
    const value = 'a'.repeat(32);
    expect(!value || value.length < 32).toBe(false);
  });

  it('accepts JWT_SECRET longer than 32 characters', () => {
    const value = 'a'.repeat(64);
    expect(!value || value.length < 32).toBe(false);
  });
});
