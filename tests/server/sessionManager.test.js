// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  default: {},
}));

vi.mock('os', () => ({
  default: {
    homedir: () => '/home/testuser',
  },
  homedir: () => '/home/testuser',
}));

import { promises as fs } from 'fs';

let SessionManager;

beforeAll(async () => {
  const mod = await import('../../../server/sessionManager.js');
  SessionManager = mod.default;
});

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new session', async () => {
    const session = await SessionManager.createSession('test-session-1', '/project/path');
    expect(session.id).toBe('test-session-1');
    expect(session.projectPath).toBe('/project/path');
    expect(session.messages).toEqual([]);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('retrieves a session by ID', async () => {
    await SessionManager.createSession('test-session-2', '/project/path');
    const session = SessionManager.getSession('test-session-2');
    expect(session).toBeDefined();
    expect(session.id).toBe('test-session-2');
  });

  it('returns undefined for non-existent session', () => {
    const session = SessionManager.getSession('non-existent');
    expect(session).toBeUndefined();
  });

  it('adds a message to an existing session', async () => {
    await SessionManager.createSession('test-session-3', '/project/path');
    const session = await SessionManager.addMessage('test-session-3', 'user', 'Hello');
    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].role).toBe('user');
    expect(session.messages[0].content).toBe('Hello');
  });

  it('creates session when adding message to non-existent session', async () => {
    const session = await SessionManager.addMessage('auto-created', 'user', 'Auto message');
    expect(session).toBeDefined();
    expect(session.id).toBe('auto-created');
    expect(session.messages).toHaveLength(1);
  });

  it('returns "New Session" for empty session summary', async () => {
    await SessionManager.createSession('test-session-4', '/project/path');
    const summary = SessionManager.getSessionSummary(SessionManager.getSession('test-session-4'));
    expect(summary).toBe('New Session');
  });

  it('returns custom summary when set', async () => {
    await SessionManager.createSession('test-session-5', '/project/path');
    await SessionManager.updateSessionSummary('test-session-5', 'My Custom Summary');
    const summary = SessionManager.getSessionSummary(SessionManager.getSession('test-session-5'));
    expect(summary).toBe('My Custom Summary');
  });

  it('truncates long first user message for summary', async () => {
    const longMsg = 'A'.repeat(100);
    await SessionManager.createSession('test-session-6', '/project/path');
    await SessionManager.addMessage('test-session-6', 'user', longMsg);
    const summary = SessionManager.getSessionSummary(SessionManager.getSession('test-session-6'));
    expect(summary.length).toBeLessThanOrEqual(53);
    expect(summary.endsWith('...')).toBe(true);
  });

  it('gets sessions for a specific project path', async () => {
    await SessionManager.createSession('proj-a-1', '/project/a');
    await SessionManager.createSession('proj-a-2', '/project/a');
    await SessionManager.createSession('proj-b-1', '/project/b');

    const sessions = SessionManager.getProjectSessions('/project/a');
    expect(sessions).toHaveLength(2);
    expect(sessions.every(s => s.id.startsWith('proj-a'))).toBe(true);
  });

  it('deletes a session', async () => {
    await SessionManager.createSession('to-delete', '/project/path');
    expect(SessionManager.getSession('to-delete')).toBeDefined();

    await SessionManager.deleteSession('to-delete');
    expect(SessionManager.getSession('to-delete')).toBeUndefined();
  });

  it('returns empty string from buildConversationContext for empty session', async () => {
    await SessionManager.createSession('empty-context', '/project/path');
    const context = SessionManager.buildConversationContext('empty-context');
    expect(context).toBe('');
  });

  it('builds conversation context from session messages', async () => {
    await SessionManager.createSession('context-session', '/project/path');
    await SessionManager.addMessage('context-session', 'user', 'Hello');
    await SessionManager.addMessage('context-session', 'assistant', 'Hi there');

    const context = SessionManager.buildConversationContext('context-session');
    expect(context).toContain('Hello');
    expect(context).toContain('Hi there');
  });

  it('getSessionMessages returns formatted messages', async () => {
    await SessionManager.createSession('messages-session', '/project/path');
    await SessionManager.addMessage('messages-session', 'user', 'Test message');

    const messages = SessionManager.getSessionMessages('messages-session');
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('message');
    expect(messages[0].message.role).toBe('user');
  });

  it('getSessionMessages returns empty array for non-existent session', () => {
    const messages = SessionManager.getSessionMessages('non-existent');
    expect(messages).toEqual([]);
  });
});
