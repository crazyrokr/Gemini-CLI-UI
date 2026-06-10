// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWrite = vi.fn();

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      ...actual.default,
      mkdirSync: vi.fn(),
      createWriteStream: vi.fn(() => ({ write: mockWrite })),
    },
  };
});

import { auditLog } from '../../../server/utils/auditLog.js';
import fs from 'fs';

describe('auditLog', () => {
  beforeEach(() => {
    mockWrite.mockClear();
    fs.mkdirSync.mockClear();
    fs.createWriteStream.mockClear();
  });

  it('creates the log directory and write stream on first call', () => {
    auditLog('test_event');

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('audit'),
      { recursive: true }
    );
    expect(fs.createWriteStream).toHaveBeenCalledWith(
      expect.stringMatching(/audit-\d{4}-\d{2}-\d{2}\.ndjson/),
      { flags: 'a' }
    );
  });

  it('writes a JSON line with timestamp and event name', () => {
    auditLog('test_event');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0];
    const parsed = JSON.parse(written);
    expect(parsed.event).toBe('test_event');
    expect(parsed.timestamp).toBeTruthy();
  });

  it('includes additional details in the log entry', () => {
    auditLog('shell_session_start', {
      userId: 1,
      username: 'admin',
      projectPath: '/home/user/project',
    });

    const written = JSON.parse(mockWrite.mock.calls[0][0]);
    expect(written.event).toBe('shell_session_start');
    expect(written.userId).toBe(1);
    expect(written.username).toBe('admin');
    expect(written.projectPath).toBe('/home/user/project');
  });

  it('appends a newline after each entry', () => {
    auditLog('test');
    const written = mockWrite.mock.calls[0][0];
    expect(written.endsWith('\n')).toBe(true);
  });

  it('reuses the same stream for subsequent calls', () => {
    auditLog('event1');
    auditLog('event2');

    // createWriteStream should have been called at most once (stream is cached)
    expect(fs.createWriteStream.mock.calls.length).toBeLessThanOrEqual(1);
    // But write should be called twice
    expect(mockWrite).toHaveBeenCalledTimes(2);
  });

  it('writes valid NDJSON — each line is parseable JSON', () => {
    auditLog('login', { user: 'admin' });

    const line = mockWrite.mock.calls[0][0].trim();
    const parsed = JSON.parse(line);
    expect(parsed).toEqual({
      timestamp: expect.any(String),
      event: 'login',
      user: 'admin',
    });
  });
});
