import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProvider, useUser } from './UserContext';
import { authService } from '../services/authService';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    me: vi.fn(),
    logout: vi.fn(),
    googleLogin: vi.fn(),
  }
}));

// Mock Google OAuth
vi.mock('@react-oauth/google', () => ({
  useGoogleOneTapLogin: vi.fn()
}));

const TestComponent = () => {
  const { user, isLoggedIn, logout, refreshUser } = useUser();
  return (
    <div>
      <span data-testid="status">{isLoggedIn ? 'Logged In' : 'Logged Out'}</span>
      <span data-testid="username">{user ? user.username : 'No User'}</span>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
      <button data-testid="refresh-btn" onClick={refreshUser}>Refresh</button>
    </div>
  );
};

const AccessComponent = () => {
  const { hasAccess } = useUser();
  return (
    <div>
      <span data-testid="gg-access">{hasAccess('gg') ? 'yes' : 'no'}</span>
      <span data-testid="ten-plus-access">{hasAccess('10+') ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('refreshUser updates state correctly on success', async () => {
    const mockUserData = {
      id: '1',
      username: 'TestUser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      subscription: { tier: 'free' as const, expiresAt: '' },
      favorite_teams: ['Arsenal']
    };
    vi.mocked(authService.me).mockResolvedValueOnce(mockUserData);

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    // Context calls refreshUser on mount
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('Logged In');
      expect(screen.getByTestId('username').textContent).toBe('TestUser');
    });

    // Check localStorage cache sync for favorite teams
    expect(localStorage.getItem('tambua_fav_teams')).toBe(JSON.stringify(['Arsenal']));
  });

  it('secure context destruction on logout', async () => {
    // Start with a logged-in user
    const mockUserData = {
      id: '1',
      username: 'TestUser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      subscription: { tier: 'free' as const, expiresAt: '' }
    };
    vi.mocked(authService.me).mockResolvedValueOnce(mockUserData);

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('TestUser');
    });

    // Click logout
    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    // Expect authService.logout to be called
    expect(authService.logout).toHaveBeenCalled();

    // Expect user to be null
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('Logged Out');
      expect(screen.getByTestId('username').textContent).toBe('No User');
    });
  });
  
  it('destroys context when unauthorized event is dispatched', async () => {
    const mockUserData = {
      id: '1',
      username: 'TestUser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      subscription: { tier: 'free' as const, expiresAt: '' }
    };
    vi.mocked(authService.me).mockResolvedValueOnce(mockUserData);

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('TestUser');
    });

    // Dispatch custom unauthorized event
    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    // Expect user to be cleared
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('Logged Out');
    });
  });

  it('grants access from active subscription entitlements', async () => {
    const mockUserData = {
      id: '1',
      username: 'TestUser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      subscription: { tier: 'free' as const, expiresAt: '' },
      subscription_entitlements: [
        {
          id: 10,
          tier_id: 'tier_gg',
          expires_at: '2099-01-01T00:00:00Z',
          payment_id: null,
          source: 'admin',
        },
      ],
    };
    vi.mocked(authService.me).mockResolvedValueOnce(mockUserData);

    render(
      <UserProvider>
        <AccessComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('gg-access').textContent).toBe('yes');
      expect(screen.getByTestId('ten-plus-access').textContent).toBe('no');
    });
  });
});
