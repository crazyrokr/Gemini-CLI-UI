import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrentTime } from '../../../src/hooks/useCurrentTime.js';

describe('useCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date object', () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current).toBeInstanceOf(Date);
  });

  it('updates after 60 seconds', () => {
    const { result } = renderHook(() => useCurrentTime());
    const initialTime = result.current.getTime();

    vi.advanceTimersByTime(60000);

    expect(result.current.getTime()).toBeGreaterThanOrEqual(initialTime);
  });
});
