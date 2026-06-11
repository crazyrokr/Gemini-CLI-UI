import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../src/components/GeminiLogo', () => ({
  default: () => <div data-testid="gemini-logo" />,
}));

import SetupForm from '../../../src/components/SetupForm.jsx';
import { useAuth } from '../../../src/contexts/AuthContext';

describe('SetupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username, password, and confirm password fields', () => {
    useAuth.mockReturnValue({ register: vi.fn() });
    render(<SetupForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders create account button', () => {
    useAuth.mockReturnValue({ register: vi.fn() });
    render(<SetupForm />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls register with username and password on form submit', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ register: mockRegister });
    render(<SetupForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegister).toHaveBeenCalledWith('admin', 'password123');
  });

  it('displays error when passwords do not match', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ register: mockRegister });
    render(<SetupForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error when username is too short', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ register: mockRegister });
    render(<SetupForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'ab');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/at least 3 characters/)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error when password is too short', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ register: mockRegister });
    render(<SetupForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/^password/i), '12345');
    await userEvent.type(screen.getByLabelText(/confirm password/i), '12345');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/at least 6 characters/)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error when register fails', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: false, error: 'User already exists' });
    useAuth.mockReturnValue({ register: mockRegister });
    render(<SetupForm />);

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('User already exists')).toBeInTheDocument();
  });
});
