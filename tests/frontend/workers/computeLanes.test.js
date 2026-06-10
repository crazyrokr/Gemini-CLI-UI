import { describe, it, expect } from 'vitest';
import { computeLanes, BRANCH_COLORS } from '../../../src/workers/computeLanes.js';

describe('computeLanes', () => {
  it('returns empty array for empty array input', () => {
    expect(computeLanes([])).toEqual([]);
  });

  it('returns empty array for null input', () => {
    expect(computeLanes(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(computeLanes(undefined)).toEqual([]);
  });

  it('assigns lane 0 and valid color to a single root commit', () => {
    const commits = [{ hash: 'abc123', parents: [] }];
    const result = computeLanes(commits);
    expect(result).toHaveLength(1);
    expect(result[0].lane).toBe(0);
    expect(result[0].color).toBe(BRANCH_COLORS[0]);
    expect(result[0].edges).toEqual([]);
    expect(result[0].hash).toBe('abc123');
  });

  it('throws TypeError for commit missing hash', () => {
    const commits = [{ parents: [] }];
    expect(() => computeLanes(commits)).toThrow(TypeError);
    expect(() => computeLanes(commits)).toThrow('missing required hash property');
  });

  it('assigns lane 0 to all commits in a linear chain', () => {
    const commits = [
      { hash: 'c3', parents: ['c2'] },
      { hash: 'c2', parents: ['c1'] },
      { hash: 'c1', parents: [] },
    ];
    const result = computeLanes(commits);
    expect(result.every(c => c.lane === 0)).toBe(true);
  });

  it('creates merge edge for commit with two parents', () => {
    const commits = [
      { hash: 'merge', parents: ['p1', 'p2'] },
      { hash: 'p1', parents: [] },
      { hash: 'p2', parents: [] },
    ];
    const result = computeLanes(commits);
    const mergeCommit = result[0];
    expect(mergeCommit.edges).toHaveLength(2);
    const directEdge = mergeCommit.edges.find(e => e.type === 'direct');
    const mergeEdge = mergeCommit.edges.find(e => e.type === 'merge');
    expect(directEdge).toBeDefined();
    expect(mergeEdge).toBeDefined();
  });

  it('assigns different lanes to branch children sharing a parent', () => {
    const commits = [
      { hash: 'child-a', parents: ['shared-parent'] },
      { hash: 'child-b', parents: ['shared-parent'] },
      { hash: 'shared-parent', parents: [] },
    ];
    const result = computeLanes(commits);
    const childA = result.find(c => c.hash === 'child-a');
    const childB = result.find(c => c.hash === 'child-b');
    expect(childA.lane).not.toBe(childB.lane);
  });

  it('marks edge as isSplit when parent already has a lane from another child', () => {
    const commits = [
      { hash: 'child-a', parents: ['shared'] },
      { hash: 'child-b', parents: ['shared'] },
      { hash: 'shared', parents: [] },
    ];
    const result = computeLanes(commits);
    const childB = result.find(c => c.hash === 'child-b');
    const splitEdge = childB.edges.find(e => e.parentHash === 'shared');
    expect(splitEdge.isSplit).toBe(true);
  });

  it('cycles colors via modulo for 8+ concurrent branches', () => {
    const commits = [];
    for (let i = 0; i < 10; i++) {
      commits.push({ hash: `branch-${i}`, parents: [`parent-${i}`] });
    }
    const result = computeLanes(commits);
    expect(result).toHaveLength(10);
    expect(result[0].color).toBe(BRANCH_COLORS[0]);
    expect(result[8].color).toBe(BRANCH_COLORS[8 % BRANCH_COLORS.length]);
  });

  it('preserves original commit properties in output', () => {
    const commits = [
      { hash: 'abc', parents: [], message: 'init', author: 'Alice' },
    ];
    const result = computeLanes(commits);
    expect(result[0].message).toBe('init');
    expect(result[0].author).toBe('Alice');
    expect(result[0].hash).toBe('abc');
  });
});
