import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../../../src/components/common/MonacoDiffViewer', () => ({
  default: () => <div data-testid="monaco-diff" />,
}));

import DiffTool from '../../../../../src/components/chat/tools/DiffTool.jsx';

describe('DiffTool', () => {
  it('renders nothing when input has no file_path', () => {
    const { container } = render(<DiffTool input={{}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when input is null', () => {
    const { container } = render(<DiffTool input={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('displays the filename from file_path', () => {
    render(<DiffTool input={{ file_path: 'src/app.js' }} />);
    expect(screen.getByText('app.js')).toBeInTheDocument();
  });

  it('shows "New File" label when content is defined', () => {
    render(<DiffTool input={{ file_path: 'new.js', content: 'hello' }} />);
    expect(screen.getByText('New File')).toBeInTheDocument();
  });

  it('shows "Diff" label when content is not defined', () => {
    render(<DiffTool input={{ file_path: 'old.js', old_string: 'a', new_string: 'b' }} />);
    expect(screen.getByText('Diff')).toBeInTheDocument();
  });

  it('calls onFileOpen when filename is clicked', async () => {
    const onFileOpen = vi.fn();
    render(<DiffTool input={{ file_path: 'src/app.js' }} onFileOpen={onFileOpen} />);
    await userEvent.click(screen.getByText('app.js'));
    expect(onFileOpen).toHaveBeenCalledWith('src/app.js', expect.any(Object));
  });
});
