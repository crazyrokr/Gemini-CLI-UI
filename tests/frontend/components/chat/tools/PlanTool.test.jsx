import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../../src/components/common/ChevronIcon', () => ({
  default: ({ className }) => <svg data-testid="chevron" className={className} />,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

import PlanTool from '../../../../../src/components/chat/tools/PlanTool.jsx';

describe('PlanTool', () => {
  it('renders nothing when plan is null', () => {
    const { container } = render(<PlanTool plan={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when plan is undefined', () => {
    const { container } = render(<PlanTool />);
    expect(container.innerHTML).toBe('');
  });

  it('renders plan content as markdown', () => {
    render(<PlanTool plan="## Step 1\nDo something" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('## Step 1');
    expect(screen.getByTestId('markdown')).toHaveTextContent('Do something');
  });

  it('replaces escaped newlines with actual newlines', () => {
    render(<PlanTool plan="Step 1\\nStep 2" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Step 1');
    expect(screen.getByTestId('markdown')).toHaveTextContent('Step 2');
  });

  it('renders the implementation plan heading', () => {
    render(<PlanTool plan="Some plan" />);
    expect(screen.getByText(/View implementation plan/)).toBeInTheDocument();
  });
});
