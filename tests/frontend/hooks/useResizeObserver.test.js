import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResizeObserver } from '../../../src/hooks/useResizeObserver.js';

describe('useResizeObserver', () => {
  it('returns initial dimensions of { width: 0, height: 0 }', () => {
    const { result } = renderHook(() => useResizeObserver({ current: document.createElement('div') }));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it('returns default dimensions when ref is null', () => {
    const { result } = renderHook(() => useResizeObserver({ current: null }));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it('returns default dimensions when ref is undefined', () => {
    const { result } = renderHook(() => useResizeObserver({ current: undefined }));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it('does not throw when element is provided', () => {
    expect(() => {
      renderHook(() => useResizeObserver({ current: document.createElement('div') }));
    }).not.toThrow();
  });
});
