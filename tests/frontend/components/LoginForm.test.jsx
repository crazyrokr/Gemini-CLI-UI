import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="message-icon" />,
}));

import LoginForm from '../../../src/components/LoginForm.jsx';
import { useAuth } from '../../../src/contexts/AuthContext';

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password fields', () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    render(<LoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login with username and password on form submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ login: mockLogin });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
  });

  it('displays error message when login fails', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: false, error: 'Invalid credentials' });
    useAuth.mockReturnValue({ login: mockLogin });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
