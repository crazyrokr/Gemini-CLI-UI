import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BashTool from '../../../../../src/components/chat/tools/BashTool.jsx';

vi.mock('../../../../../src/components/common/ChevronIcon', () => ({
  default: () => <svg data-testid="chevron" />,
}));

describe('BashTool', () => {
  it('displays the command with $ prefix', () => {
    render(<BashTool command="npm test" />);
    expect(screen.getByText(/\$ npm test/)).toBeInTheDocument();
  });

  it('displays "(no command)" when command is empty', () => {
    render(<BashTool command="" />);
    expect(screen.getByText(/\$ \(no command\)/)).toBeInTheDocument();
  });

  it('displays "(no command)" when command is undefined', () => {
    render(<BashTool command={undefined} />);
    expect(screen.getByText(/\$ \(no command\)/)).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(<BashTool command="ls" description="List files" />);
    expect(screen.getByText('List files')).toBeInTheDocument();
  });

  it('does not display description when not provided', () => {
    render(<BashTool command="ls" />);
    expect(screen.queryByText('List files')).not.toBeInTheDocument();
  });

  it('calls clipboard.writeText when copy button is clicked', async () => {
    render(<BashTool command="npm test" />);
    const copyButton = screen.getByTitle('Copy command');
    await userEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('npm test');
  });
});
