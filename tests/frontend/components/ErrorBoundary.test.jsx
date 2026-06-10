import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ErrorBoundary from '../../../src/components/ErrorBoundary.jsx';

const ThrowingChild = () => {
  throw new Error('Test error message');
};

const NormalChild = () => <div data-testid="normal-child">Normal content</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('normal-child')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('renders refresh button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByTitle('Refresh Page')).toBeInTheDocument();
  });

  it('calls window.location.reload when refresh button is clicked', async () => {
    const reloadMock = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: reloadMock });

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByTitle('Refresh Page'));
    expect(reloadMock).toHaveBeenCalled();
  });
});
