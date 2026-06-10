import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../../src/utils/languages.js';

describe('getLanguage', () => {
  it('returns "javascript" for .js extension', () => {
    expect(getLanguage('app.js')).toBe('javascript');
  });

  it('returns "javascript" for .jsx extension', () => {
    expect(getLanguage('component.jsx')).toBe('javascript');
  });

  it('returns "javascript" for .cjs extension', () => {
    expect(getLanguage('config.cjs')).toBe('javascript');
  });

  it('returns "javascript" for .mjs extension', () => {
    expect(getLanguage('module.mjs')).toBe('javascript');
  });

  it('returns "typescript" for .ts extension', () => {
    expect(getLanguage('app.ts')).toBe('typescript');
  });

  it('returns "typescript" for .tsx extension', () => {
    expect(getLanguage('component.tsx')).toBe('typescript');
  });

  it('returns "python" for .py extension', () => {
    expect(getLanguage('main.py')).toBe('python');
  });

  it('returns "html" for .html extension', () => {
    expect(getLanguage('index.html')).toBe('html');
  });

  it('returns "html" for .htm extension', () => {
    expect(getLanguage('page.htm')).toBe('html');
  });

  it('returns "css" for .css extension', () => {
    expect(getLanguage('style.css')).toBe('css');
  });

  it('returns "scss" for .scss extension', () => {
    expect(getLanguage('style.scss')).toBe('scss');
  });

  it('returns "json" for .json extension', () => {
    expect(getLanguage('package.json')).toBe('json');
  });

  it('returns "markdown" for .md extension', () => {
    expect(getLanguage('README.md')).toBe('markdown');
  });

  it('returns "yaml" for .yml extension', () => {
    expect(getLanguage('config.yml')).toBe('yaml');
  });

  it('returns "yaml" for .yaml extension', () => {
    expect(getLanguage('config.yaml')).toBe('yaml');
  });

  it('returns "sql" for .sql extension', () => {
    expect(getLanguage('query.sql')).toBe('sql');
  });

  it('returns "shell" for .sh extension', () => {
    expect(getLanguage('script.sh')).toBe('shell');
  });

  it('returns "java" for .java extension', () => {
    expect(getLanguage('Main.java')).toBe('java');
  });

  it('returns "rust" for .rs extension', () => {
    expect(getLanguage('main.rs')).toBe('rust');
  });

  it('returns "go" for .go extension', () => {
    expect(getLanguage('main.go')).toBe('go');
  });

  describe('special filenames', () => {
    it('returns "ini" for .env', () => {
      expect(getLanguage('.env')).toBe('ini');
    });

    it('returns "ini" for .env.local', () => {
      expect(getLanguage('.env.local')).toBe('ini');
    });

    it('returns "ini" for .env.production', () => {
      expect(getLanguage('.env.production')).toBe('ini');
    });

    it('returns "shell" for .gitignore', () => {
      expect(getLanguage('.gitignore')).toBe('shell');
    });

    it('returns "shell" for .npmignore', () => {
      expect(getLanguage('.npmignore')).toBe('shell');
    });

    it('returns "shell" for .dockerignore', () => {
      expect(getLanguage('.dockerignore')).toBe('shell');
    });

    it('returns "dockerfile" for Dockerfile', () => {
      expect(getLanguage('Dockerfile')).toBe('dockerfile');
    });

    it('returns "makefile" for Makefile', () => {
      expect(getLanguage('Makefile')).toBe('makefile');
    });
  });

  describe('edge cases', () => {
    it('returns "plaintext" for null', () => {
      expect(getLanguage(null)).toBe('plaintext');
    });

    it('returns "plaintext" for undefined', () => {
      expect(getLanguage(undefined)).toBe('plaintext');
    });

    it('returns "plaintext" for empty string', () => {
      expect(getLanguage('')).toBe('plaintext');
    });

    it('returns "javascript" for uppercase .JS extension (case insensitive)', () => {
      expect(getLanguage('App.JS')).toBe('javascript');
    });

    it('returns "plaintext" for unknown extension', () => {
      expect(getLanguage('file.xyz')).toBe('plaintext');
    });
  });
});
