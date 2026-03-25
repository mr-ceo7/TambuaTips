import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText(/Tambua/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tips/i).length).toBeGreaterThan(0);
  });
});


