import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../../src/components/common/ChevronIcon', () => ({
  default: () => <svg data-testid="chevron" />,
}));

vi.mock('../../../../../src/components/TodoList', () => ({
  default: ({ todos }) => <div data-testid="todo-list">{JSON.stringify(todos)}</div>,
}));

import TodoTool from '../../../../../src/components/chat/tools/TodoTool.jsx';

describe('TodoTool', () => {
  it('renders nothing when input has no todos', () => {
    const { container } = render(<TodoTool input={{}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when input is null', () => {
    const { container } = render(<TodoTool input={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when todos is not an array', () => {
    const { container } = render(<TodoTool input={{ todos: 'not-array' }} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders todo list when input has valid todos', () => {
    const todos = [
      { content: 'Task 1', status: 'pending' },
      { content: 'Task 2', status: 'completed' },
    ];
    render(<TodoTool input={{ todos }} />);
    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
  });

  it('displays the "Updating Todo List" summary', () => {
    const todos = [{ content: 'Task 1', status: 'pending' }];
    render(<TodoTool input={{ todos }} />);
    expect(screen.getByText('Updating Todo List')).toBeInTheDocument();
  });
});
