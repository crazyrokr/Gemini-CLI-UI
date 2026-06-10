import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../package.json', () => ({
  version: '1.5.0',
}));

import { useVersionCheck } from '../../../src/hooks/useVersionCheck.js';

describe('useVersionCheck', () => {
  it('returns updateAvailable as false (feature is disabled)', () => {
    const { result } = renderHook(() => useVersionCheck('owner', 'repo'));
    expect(result.current.updateAvailable).toBe(false);
  });

  it('returns latestVersion as null (feature is disabled)', () => {
    const { result } = renderHook(() => useVersionCheck('owner', 'repo'));
    expect(result.current.latestVersion).toBeNull();
  });

  it('returns currentVersion matching package.json version', () => {
    const { result } = renderHook(() => useVersionCheck('owner', 'repo'));
    expect(result.current.currentVersion).toBe('1.5.0');
  });
});
