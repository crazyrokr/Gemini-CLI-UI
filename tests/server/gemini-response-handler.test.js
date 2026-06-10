// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GeminiResponseHandler from '../../server/gemini-response-handler.js';

describe('GeminiResponseHandler', () => {
  let mockWs;
  let handler;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWs = { send: vi.fn() };
    handler = new GeminiResponseHandler(mockWs, { partialDelay: 100, maxWaitTime: 1000, minBufferSize: 10 });
  });

  afterEach(() => {
    handler.destroy();
    vi.useRealTimers();
  });

  describe('processData', () => {
    it('flushes immediately when content ends with a period and exceeds minBufferSize', () => {
      handler.processData('Hello world. This is a complete sentence.');
      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('gemini-response');
      expect(sent.data.content).toContain('Hello world.');
    });

    it('buffers short content below minBufferSize', () => {
      handler.processData('Hi.');
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('flushes buffered content after partialDelay timer fires', () => {
      handler.processData('Short text');
      expect(mockWs.send).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(mockWs.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('code block handling', () => {
    it('waits when inside an open code block', () => {
      handler.processData('Here is code: ```javascript\nconst x = 1');
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('flushes when code block is closed', () => {
      handler.processData('Here is code: ```javascript\nconst x = 1\n```');
      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sent.data.content).toContain('```javascript');
      expect(sent.data.content).toContain('```');
    });
  });

  describe('forceFlush', () => {
    it('sends remaining buffered content immediately', () => {
      handler.processData('Some buffered content that is not complete');
      expect(mockWs.send).not.toHaveBeenCalled();
      handler.forceFlush();
      expect(mockWs.send).toHaveBeenCalledTimes(1);
    });

    it('does nothing when buffer is empty', () => {
      handler.forceFlush();
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('flushes remaining content and clears timers', () => {
      handler.processData('Unsent content here for destroy test');
      handler.destroy();
      expect(mockWs.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('fixFormatting', () => {
    it('collapses excessive newlines (4+) to 3', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      const result = handler2.fixFormatting('line1\n\n\n\n\nline2');
      expect(result).toBe('line1\n\n\nline2');
    });

    it('fixes numbered list spacing', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      const result = handler2.fixFormatting('1. First item\n\n\n2. Second item');
      expect(result).toBe('1. First item\n2. Second item');
    });

    it('preserves code blocks from formatting changes', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      const result = handler2.fixFormatting('```js\n\n\nconst x = 1;\n\n\n```\nEnd');
      expect(result).toContain('```js');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });
  });

  describe('isComplete', () => {
    it('returns true for content ending with period', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('Hello world.')).toBe(true);
    });

    it('returns true for content ending with question mark', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('How are you?')).toBe(true);
    });

    it('returns true for content ending with exclamation mark', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('Wow!')).toBe(true);
    });

    it('returns true for content ending with closing code fence', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('```\ncode\n```')).toBe(true);
    });

    it('returns true for content without special endings (default)', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('some text')).toBe(true);
    });

    it('returns false for content with an open code block', () => {
      const handler2 = new GeminiResponseHandler(mockWs);
      expect(handler2.isComplete('```javascript\ncode')).toBe(false);
    });
  });

  describe('shouldSendImmediately', () => {
    it('returns false when buffer is below minBufferSize', () => {
      handler.buffer = 'ab';
      const result = handler.shouldSendImmediately();
      expect(result).toBe(false);
    });

    it('returns true when content ends with a completion pattern', () => {
      handler.buffer = 'This is a long enough sentence that ends with a period.';
      const result = handler.shouldSendImmediately();
      expect(result).toBe(true);
    });

    it('returns true when maxWaitTime has elapsed', () => {
      handler.config.minBufferSize = 1;
      handler.lastSentTime = Date.now() - 2000;
      handler.buffer = 'x';
      const result = handler.shouldSendImmediately();
      expect(result).toBe(true);
    });
  });
});
