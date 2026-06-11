import { describe, it, expect } from 'vitest';
import { createDiff } from '../../../src/utils/diff.js';

describe('createDiff', () => {
  it('returns empty array for identical strings', () => {
    const result = createDiff('hello', 'hello');
    expect(result).toEqual([]);
  });

  it('returns empty array for both empty strings', () => {
    const result = createDiff('', '');
    expect(result).toEqual([]);
  });

  it('returns empty array for both null arguments', () => {
    const result = createDiff(null, null);
    expect(result).toEqual([]);
  });

  it('returns empty array for both undefined arguments', () => {
    const result = createDiff(undefined, undefined);
    expect(result).toEqual([]);
  });

  it('marks all new lines as added when old string is empty', () => {
    const result = createDiff('', 'a\nb\nc');
    const addedLines = result.filter(r => r.type === 'added').map(r => r.content);
    expect(addedLines).toEqual(['a', 'b', 'c']);
  });

  it('marks all old lines as removed when new string is empty', () => {
    const result = createDiff('a\nb\nc', '');
    const removedLines = result.filter(r => r.type === 'removed').map(r => r.content);
    expect(removedLines).toEqual(['a', 'b', 'c']);
  });

  it('detects a single line change', () => {
    const result = createDiff('line1\nline2', 'line1\nline3');
    expect(result).toEqual([
      { type: 'removed', content: 'line2' },
      { type: 'added', content: 'line3' },
    ]);
  });

  it('detects added lines in the middle', () => {
    const oldStr = 'line1\nline3';
    const newStr = 'line1\nline2\nline3';
    const result = createDiff(oldStr, newStr);
    const addedLines = result.filter(r => r.type === 'added');
    expect(addedLines).toEqual([{ type: 'added', content: 'line2' }]);
    expect(result.filter(r => r.type === 'removed')).toEqual([]);
  });

  it('detects removed lines in the middle', () => {
    const oldStr = 'line1\nline2\nline3';
    const newStr = 'line1\nline3';
    const result = createDiff(oldStr, newStr);
    const removedLines = result.filter(r => r.type === 'removed');
    expect(removedLines).toEqual([{ type: 'removed', content: 'line2' }]);
    expect(result.filter(r => r.type === 'added')).toEqual([]);
  });

  it('detects both additions and removals', () => {
    const oldStr = 'a\nb\nc';
    const newStr = 'a\nd\ne';
    const result = createDiff(oldStr, newStr);
    expect(result).toContainEqual({ type: 'removed', content: 'b' });
    expect(result).toContainEqual({ type: 'removed', content: 'c' });
    expect(result).toContainEqual({ type: 'added', content: 'd' });
    expect(result).toContainEqual({ type: 'added', content: 'e' });
  });

  it('returns new object references on cache hit (deep copy)', () => {
    const result1 = createDiff('a', 'b');
    const result2 = createDiff('a', 'b');
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
    expect(result1[0]).not.toBe(result2[0]);
  });

  it('handles single-line strings', () => {
    const result = createDiff('old', 'new');
    expect(result).toEqual([
      { type: 'removed', content: 'old' },
      { type: 'added', content: 'new' },
    ]);
  });

  it('handles null old string as empty', () => {
    const result = createDiff(null, 'added');
    const addedLines = result.filter(r => r.type === 'added').map(r => r.content);
    expect(addedLines).toContain('added');
  });

  it('handles null new string as empty', () => {
    const result = createDiff('removed', null);
    const removedLines = result.filter(r => r.type === 'removed').map(r => r.content);
    expect(removedLines).toContain('removed');
  });
});
