import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn().mockReturnValue({
    user: null,
    isLoggedIn: false,
    showPricingModal: false,
    setShowPricingModal: vi.fn(),
    showAuthModal: false,
    setShowAuthModal: vi.fn(),
    logout: vi.fn(),
    showReferralModal: false,
    setShowReferralModal: vi.fn(),
  }),
}));

describe('Header', () => {
  it('renders the app title', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText(/Tambua/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tips/i).length).toBeGreaterThan(0);
  });
});
