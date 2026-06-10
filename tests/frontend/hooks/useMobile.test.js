import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from '../../../src/hooks/useMobile.js';

describe('useMobile', () => {
  it('returns false when window width is above 768', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when window width is below 768', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns true when window width is exactly 767', () => {
    window.innerWidth = 767;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window width is exactly 768', () => {
    window.innerWidth = 768;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('updates when window is resized from desktop to mobile', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('updates when window is resized from mobile to desktop', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);

    act(() => {
      window.innerWidth = 1200;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });
});
