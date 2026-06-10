import { describe, it, expect } from 'vitest';
import { convertSessionMessages } from '../../../src/utils/messageConverter.js';

describe('convertSessionMessages', () => {
  it('returns empty array for null input', () => {
    expect(convertSessionMessages(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(convertSessionMessages(undefined)).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(convertSessionMessages([])).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(convertSessionMessages('not an array')).toEqual([]);
  });

  it('converts user text message', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'user',
      content: 'Hello',
    });
  });

  it('converts assistant text message', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi there' }],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'assistant',
      content: 'Hi there',
    });
  });

  it('converts assistant string content (not array)', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: 'Plain string response',
        },
      },
    ];
    const result = convertSessionMessages(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'assistant',
      content: 'Plain string response',
    });
  });

  it('filters out user messages starting with <command-name>', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'text', text: '<command-name>some command</command-name>' }],
        },
      },
    ];
    expect(convertSessionMessages(raw)).toEqual([]);
  });

  it('filters out user messages starting with [Request interrupted', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'text', text: '[Request interrupted by user]' }],
        },
      },
    ];
    expect(convertSessionMessages(raw)).toEqual([]);
  });

  it('converts tool_use with matching tool_result', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:01:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'result text' }],
        },
      },
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/src/app.js' } },
          ],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    const toolUse = result.find(m => m.isToolUse);
    expect(toolUse).toMatchObject({
      isToolUse: true,
      toolName: 'Read',
      toolResult: 'result text',
      toolError: false,
    });
    expect(JSON.parse(toolUse.toolInput)).toEqual({ file_path: '/src/app.js' });
  });

  it('sets toolError to true for error results', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:01:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'error occurred', is_error: true }],
        },
      },
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    const toolUse = result.find(m => m.isToolUse);
    expect(toolUse.toolError).toBe(true);
  });

  it('handles tool_use without matching tool_result', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-999', name: 'Write', input: { file_path: '/new.js' } },
          ],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    const toolUse = result.find(m => m.isToolUse);
    expect(toolUse.toolResult).toBeNull();
    expect(toolUse.toolError).toBe(false);
  });

  it('handles tool_result with object content by stringifying', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:01:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: { nested: true } }],
        },
      },
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
          ],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    const toolUse = result.find(m => m.isToolUse);
    expect(toolUse.toolResult).toBe('{"nested":true}');
  });

  it('handles tool_result with null content', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:01:00.000Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: null }],
        },
      },
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Bash', input: {} },
          ],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    const toolUse = result.find(m => m.isToolUse);
    expect(toolUse.toolResult).toBeNull();
  });

  it('handles invalid timestamp gracefully', () => {
    const raw = [
      {
        timestamp: 'invalid-date',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      },
    ];
    const result = convertSessionMessages(raw);
    expect(result[0].timestamp).toBeTruthy();
  });

  it('converts user message with string content', () => {
    const raw = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          role: 'user',
          content: 'A simple string message',
        },
      },
    ];
    const result = convertSessionMessages(raw);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('A simple string message');
  });
});
