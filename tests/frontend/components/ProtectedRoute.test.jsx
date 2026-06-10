import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../src/components/LoginForm', () => ({
  default: () => <div data-testid="login-form">Login</div>,
}));

vi.mock('../../../src/components/SetupForm', () => ({
  default: () => <div data-testid="setup-form">Setup</div>,
}));

vi.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="message-icon" />,
}));

import ProtectedRoute from '../../../src/components/ProtectedRoute.jsx';
import { useAuth } from '../../../src/contexts/AuthContext';

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({ user: { username: 'admin' }, isLoading: false, needsSetup: false });
    render(<ProtectedRoute><div data-testid="protected">Protected Content</div></ProtectedRoute>);
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('renders LoginForm when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false, needsSetup: false });
    render(<ProtectedRoute><div data-testid="protected">Protected</div></ProtectedRoute>);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('renders SetupForm when needsSetup is true', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false, needsSetup: true });
    render(<ProtectedRoute><div data-testid="protected">Protected</div></ProtectedRoute>);
    expect(screen.getByTestId('setup-form')).toBeInTheDocument();
  });

  it('renders loading screen when isLoading is true', () => {
    useAuth.mockReturnValue({ user: null, isLoading: true, needsSetup: false });
    render(<ProtectedRoute><div data-testid="protected">Protected</div></ProtectedRoute>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
