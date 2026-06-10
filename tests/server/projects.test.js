// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    access: vi.fn(),
  },
  default: {
    createReadStream: vi.fn(),
  },
}));

vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn(),
  },
}));

import { promises as fs } from 'fs';
import { renameProject, loadProjectConfig, saveProjectConfig } from '../../../server/projects.js';

describe('projects utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadProjectConfig', () => {
    it('returns parsed config when file exists', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ 'my-project': { displayName: 'My App' } }));
      const config = await loadProjectConfig();
      expect(config).toEqual({ 'my-project': { displayName: 'My App' } });
    });

    it('returns empty object when file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      const config = await loadProjectConfig();
      expect(config).toEqual({});
    });
  });

  describe('saveProjectConfig', () => {
    it('writes config as formatted JSON', async () => {
      const config = { 'my-project': { displayName: 'My App' } };
      await saveProjectConfig(config);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(config, null, 2),
        'utf8',
      );
    });
  });

  describe('renameProject', () => {
    it('sets custom display name in config', async () => {
      fs.readFile.mockResolvedValue('{}');
      fs.writeFile.mockResolvedValue();
      const result = await renameProject('my-project', 'New Name');
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenConfig = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenConfig['my-project'].displayName).toBe('New Name');
    });

    it('removes custom name when displayName is empty', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ 'my-project': { displayName: 'Old Name' } }));
      fs.writeFile.mockResolvedValue();
      const result = await renameProject('my-project', '');
      expect(result).toBe(true);
      const writtenConfig = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenConfig['my-project']).toBeUndefined();
    });

    it('trims whitespace from displayName', async () => {
      fs.readFile.mockResolvedValue('{}');
      fs.writeFile.mockResolvedValue();
      await renameProject('my-project', '  Spaced Name  ');
      const writtenConfig = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenConfig['my-project'].displayName).toBe('Spaced Name');
    });
  });
});
