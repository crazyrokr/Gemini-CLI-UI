// @vitest-environment node

/**
 * Tests for the JWT_SECRET filtering pattern used across child process spawns.
 * The security requirement: JWT_SECRET must never be passed to child processes.
 *
 * Files applying this pattern:
 * - server/gemini-cli.js (spawnGemini)
 * - server/index.js (handleShellConnection pty.spawn)
 * - server/routes/git.js (generate-commit-message endpoint)
 * - server/routes/mcp.js (cli/list and cli/get endpoints)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('JWT_SECRET env filtering for child processes', () => {
  const sensitiveVars = ['JWT_SECRET'];

  /**
   * Simulates the filtering pattern used in the codebase:
   *   const filteredEnv = { ...process.env };
   *   delete filteredEnv.JWT_SECRET;
   */
  function filterEnv(env) {
    const filteredEnv = { ...env };
    for (const key of sensitiveVars) {
      delete filteredEnv[key];
    }
    return filteredEnv;
  }

  beforeEach(() => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.PATH = '/usr/bin';
    process.env.HOME = '/home/user';
  });

  it('removes JWT_SECRET from the filtered environment', () => {
    const filtered = filterEnv(process.env);
    expect(filtered.JWT_SECRET).toBeUndefined();
  });

  it('preserves non-sensitive environment variables', () => {
    const filtered = filterEnv(process.env);
    expect(filtered.PATH).toBe('/usr/bin');
    expect(filtered.HOME).toBe('/home/user');
  });

  it('does not mutate the original process.env', () => {
    const originalValue = process.env.JWT_SECRET;
    filterEnv(process.env);
    expect(process.env.JWT_SECRET).toBe(originalValue);
  });

  it('handles missing JWT_SECRET gracefully', () => {
    delete process.env.JWT_SECRET;
    const filtered = filterEnv(process.env);
    expect(filtered.JWT_SECRET).toBeUndefined();
    expect(filtered.PATH).toBe('/usr/bin');
  });

  it('produces a new object (not the same reference)', () => {
    const filtered = filterEnv(process.env);
    expect(filtered).not.toBe(process.env);
  });

  it('handles env with only JWT_SECRET', () => {
    const env = { JWT_SECRET: 'super-secret' };
    const filtered = filterEnv(env);
    expect(filtered).toEqual({});
  });

  it('handles empty env', () => {
    const filtered = filterEnv({});
    expect(filtered).toEqual({});
  });
});
