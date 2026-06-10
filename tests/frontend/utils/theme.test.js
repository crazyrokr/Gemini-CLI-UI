import { describe, it, expect } from 'vitest';
import { deepDarkTheme } from '../../../src/utils/theme.js';

describe('deepDarkTheme', () => {
  it('has base set to "vs-dark"', () => {
    expect(deepDarkTheme.base).toBe('vs-dark');
  });

  it('has inherit set to true', () => {
    expect(deepDarkTheme.inherit).toBe(true);
  });

  it('contains rules for all major token types', () => {
    const tokenTypes = ['keyword', 'string', 'comment', 'number', 'function', 'type', 'variable', 'operator'];
    const ruleTokens = deepDarkTheme.rules.map(r => r.token);

    for (const type of tokenTypes) {
      expect(ruleTokens).toContain(type);
    }
  });

  it('has correct editor background color', () => {
    expect(deepDarkTheme.colors['editor.background']).toBe('#0a0f1e');
  });

  it('has keyword foreground color matching VS Code Dark+', () => {
    const keywordRule = deepDarkTheme.rules.find(r => r.token === 'keyword');
    expect(keywordRule.foreground).toBe('569cd6');
  });

  it('has string foreground color matching VS Code Dark+', () => {
    const stringRule = deepDarkTheme.rules.find(r => r.token === 'string');
    expect(stringRule.foreground).toBe('ce9178');
  });

  it('has comment rule with italic font style', () => {
    const commentRule = deepDarkTheme.rules.find(r => r.token === 'comment');
    expect(commentRule.fontStyle).toBe('italic');
  });

  it('has default rule with background matching editor background', () => {
    const defaultRule = deepDarkTheme.rules.find(r => r.token === '');
    expect(defaultRule.background).toBe('0a0f1e');
  });
});
