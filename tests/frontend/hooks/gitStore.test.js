import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/utils/api', () => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useGitStore } from '../../../src/hooks/gitStore.js';
import { authenticatedFetch } from '../../../src/utils/api.js';

const initialState = useGitStore.getState();

describe('useGitStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGitStore.setState({
      ...initialState,
      selectedProject: null,
      gitStatus: null,
      branches: [],
      currentBranch: '',
      remoteStatus: null,
      stagedFiles: new Set(),
      selectedFiles: new Set(),
      gitDiff: {},
      graphData: [],
      graphLayout: [],
      graphTotal: 0,
      graphSkip: 0,
      selectedCommit: null,
      commitDiff: null,
      commitMessage: '',
      loadingState: {
        status: false,
        committing: false,
        pushing: false,
        pulling: false,
        fetching: false,
        generatingMessage: false,
        loadingGraph: false,
        isSwitching: false,
        isCreatingBranch: false,
        isRefreshing: false,
        discarding: false,
      },
      mobileView: 'diff',
      error: null,
      _worker: null,
    }, true);
  });

  describe('setLoading', () => {
    it('updates a specific loading flag', () => {
      useGitStore.getState().setLoading('status', true);
      expect(useGitStore.getState().loadingState.status).toBe(true);
      useGitStore.getState().setLoading('status', false);
      expect(useGitStore.getState().loadingState.status).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error with action and message', () => {
      useGitStore.getState().setError('commit', 'Something failed');
      expect(useGitStore.getState().error).toEqual({ action: 'commit', message: 'Something failed' });
    });

    it('clears error when message is falsy', () => {
      useGitStore.getState().setError('commit', 'err');
      useGitStore.getState().setError('commit', null);
      expect(useGitStore.getState().error).toBeNull();
    });
  });

  describe('setMobileView', () => {
    it('updates mobileView state', () => {
      useGitStore.getState().setMobileView('graph');
      expect(useGitStore.getState().mobileView).toBe('graph');
    });
  });

  describe('toggleFileStaged', () => {
    it('adds a file to stagedFiles', () => {
      useGitStore.getState().toggleFileStaged('src/app.js');
      expect(useGitStore.getState().stagedFiles.has('src/app.js')).toBe(true);
    });

    it('removes a file from stagedFiles when toggled again', () => {
      useGitStore.getState().toggleFileStaged('src/app.js');
      expect(useGitStore.getState().stagedFiles.has('src/app.js')).toBe(true);
      useGitStore.getState().toggleFileStaged('src/app.js');
      expect(useGitStore.getState().stagedFiles.has('src/app.js')).toBe(false);
    });

    it('handles multiple files independently', () => {
      useGitStore.getState().toggleFileStaged('a.js');
      useGitStore.getState().toggleFileStaged('b.js');
      expect(useGitStore.getState().stagedFiles.has('a.js')).toBe(true);
      expect(useGitStore.getState().stagedFiles.has('b.js')).toBe(true);
      expect(useGitStore.getState().stagedFiles.size).toBe(2);
    });
  });

  describe('setCommitMessage', () => {
    it('sets the commit message', () => {
      useGitStore.getState().setCommitMessage('feat: add new feature');
      expect(useGitStore.getState().commitMessage).toBe('feat: add new feature');
    });
  });

  describe('getQuickCommitMessage', () => {
    it('returns empty string when no gitStatus', () => {
      expect(useGitStore.getState().getQuickCommitMessage()).toBe('');
    });

    it('returns empty string when no files in gitStatus', () => {
      useGitStore.setState({ gitStatus: { files: [] } });
      expect(useGitStore.getState().getQuickCommitMessage()).toBe('');
    });

    it('generates message for changed files', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'src/app.js', status: 'M', isStaged: false }],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('Changed 1 file');
    });

    it('generates message for added files', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'new.js', status: 'A', isStaged: false }],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('Add 1 file');
    });

    it('generates message for untracked files', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'new.js', status: '??', isStaged: false }],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('Add 1 file');
    });

    it('generates message for deleted files', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'old.js', status: 'D', isStaged: false }],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('Delete 1 file');
    });

    it('prioritizes staged files when some are staged', () => {
      useGitStore.setState({
        gitStatus: {
          files: [
            { path: 'staged.js', status: 'M', isStaged: true },
            { path: 'unstaged.js', status: 'M', isStaged: false },
          ],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('staged.js');
      expect(msg).not.toContain('unstaged.js');
    });

    it('capitalizes the first letter of the summary', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'a.js', status: 'M', isStaged: false }],
        },
      });
      const msg = useGitStore.getState().getQuickCommitMessage();
      expect(msg).toContain('Changed');
    });
  });

  describe('fetchStatus', () => {
    it('does nothing when no project is selected', async () => {
      await useGitStore.getState().fetchStatus();
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    it('fetches and sets git status', async () => {
      useGitStore.setState({ selectedProject: { name: 'my-project' } });
      const mockStatus = {
        branch: 'main',
        files: [
          { path: 'a.js', status: 'M', isStaged: true },
          { path: 'b.js', status: '??', isStaged: false },
        ],
      };
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockStatus),
      };
      authenticatedFetch.mockResolvedValue(mockResponse);
      authenticatedFetch.mockResolvedValueOnce(mockResponse);

      // Also mock the diff fetches
      const diffResponse = {
        ok: true,
        json: () => Promise.resolve({ originalContent: '', modifiedContent: '' }),
      };

      await useGitStore.getState().fetchStatus();

      expect(useGitStore.getState().gitStatus).toEqual(mockStatus);
      expect(useGitStore.getState().currentBranch).toBe('main');
      expect(useGitStore.getState().stagedFiles.has('a.js')).toBe(true);
    });

    it('sets error status when API returns error', async () => {
      useGitStore.setState({ selectedProject: { name: 'my-project' } });
      authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Not a git repo', details: 'No .git directory found' }),
      });

      await useGitStore.getState().fetchStatus();

      expect(useGitStore.getState().gitStatus.error).toBe('Not a git repo');
    });

    it('sets error on network failure', async () => {
      useGitStore.setState({ selectedProject: { name: 'my-project' } });
      authenticatedFetch.mockRejectedValue(new Error('Network error'));

      await useGitStore.getState().fetchStatus();

      expect(useGitStore.getState().error).toEqual({ action: 'status', message: 'Network error' });
    });
  });

  describe('commit', () => {
    it('returns false when commit message is empty', async () => {
      useGitStore.setState({ commitMessage: '', stagedFiles: new Set(['a.js']) });
      const result = await useGitStore.getState().commit();
      expect(result).toBe(false);
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    it('returns false when no files are staged', async () => {
      useGitStore.setState({ commitMessage: 'test', stagedFiles: new Set() });
      const result = await useGitStore.getState().commit();
      expect(result).toBe(false);
    });

    it('commits and clears message and staged files on success', async () => {
      useGitStore.setState({
        selectedProject: { name: 'my-project' },
        commitMessage: 'feat: new feature',
        stagedFiles: new Set(['a.js']),
      });

      authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await useGitStore.getState().commit();
      expect(result).toBe(true);
      expect(useGitStore.getState().commitMessage).toBe('');
      expect(useGitStore.getState().stagedFiles.size).toBe(0);
    });
  });

  describe('generateQuickCommitMessage', () => {
    it('sets commit message from getQuickCommitMessage', () => {
      useGitStore.setState({
        gitStatus: {
          files: [{ path: 'app.js', status: 'M', isStaged: false }],
        },
        commitMessage: '',
      });
      useGitStore.getState().generateQuickCommitMessage();
      expect(useGitStore.getState().commitMessage).toContain('Changed 1 file');
    });

    it('does not overwrite when quick message is empty', () => {
      useGitStore.setState({ gitStatus: null, commitMessage: 'original' });
      useGitStore.getState().generateQuickCommitMessage();
      expect(useGitStore.getState().commitMessage).toBe('original');
    });
  });
});
