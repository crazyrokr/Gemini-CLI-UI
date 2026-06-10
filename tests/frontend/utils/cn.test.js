import { describe, it, expect } from 'vitest';
import { cn } from '../../../src/lib/utils.js';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('resolves conflicting Tailwind classes with twMerge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional class objects via clsx', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles mixed strings and conditional objects', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('handles undefined and null arguments', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });

  it('resolves multiple conflicting utilities', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
