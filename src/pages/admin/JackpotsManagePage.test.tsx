import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JackpotsManagePage } from './JackpotsManagePage';
import * as tipsService from '../../services/tipsService';
import { adminService, uploadCampaignAsset } from '../../services/adminService';

vi.mock('../../services/tipsService', () => ({
  getAllJackpots: vi.fn(),
  addJackpot: vi.fn(),
  deleteJackpot: vi.fn(),
  updateJackpot: vi.fn(),
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    getSettings: vi.fn(),
    enrichMatches: vi.fn(),
  },
  uploadCampaignAsset: vi.fn(),
}));

vi.mock('../../components/TeamLogo', () => ({
  TeamWithLogo: ({ teamName }: { teamName: string }) => <span>{teamName}</span>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('JackpotsManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getSettings).mockResolvedValue({
      jackpot_midweek_price: 500,
      jackpot_mega_price: 1000,
      jackpot_midweek_int_price: 5,
      jackpot_mega_int_price: 10,
      jackpot_prices_json: '{}',
    } as any);
    vi.mocked(adminService.enrichMatches).mockImplementation(async (matches: any) => matches);
    vi.mocked(tipsService.getAllJackpots).mockResolvedValue([
      {
        id: '1',
        type: 'midweek',
        dcLevel: 3,
        matches: [{ homeTeam: 'A', awayTeam: 'B' }],
        variations: [['1']],
        price: 500,
        result: 'pending',
        createdAt: '2026-04-14T10:00:00Z',
        updatedAt: '2026-04-14T10:00:00Z',
        regional_prices: { international: { price: 5 } },
      },
      {
        id: '2',
        type: 'mega',
        dcLevel: 4,
        matches: [{ homeTeam: 'C', awayTeam: 'D' }],
        variations: [['X'] ],
        price: 1000,
        result: 'pending',
        createdAt: '2026-04-14T10:00:00Z',
        updatedAt: '2026-04-14T10:00:00Z',
        regional_prices: { international: { price: 10 } },
      },
    ] as any);
    vi.mocked(tipsService.updateJackpot).mockImplementation(async (id: string, data: any) => ({
      id,
      type: 'midweek',
      dcLevel: 3,
      matches: [{ homeTeam: 'A', awayTeam: 'B' }],
      variations: [['1']],
      price: data.price ?? 500,
      result: data.result ?? 'pending',
      createdAt: '2026-04-14T10:00:00Z',
      updatedAt: '2026-04-14T10:00:00Z',
      regional_prices: data.regional_prices ?? { international: { price: 5 } },
    } as any));
    vi.mocked(uploadCampaignAsset).mockResolvedValue('/media/uploads/jackpot-promo.jpg');
  });

  it('applies bulk result updates to selected jackpots', async () => {
    render(<JackpotsManagePage />);

    await screen.findByText(/Jackpot Management/i);

    fireEvent.click(screen.getByLabelText('Select jackpot 1'));
    fireEvent.click(screen.getByLabelText('Select jackpot 2'));

    fireEvent.change(screen.getByDisplayValue('Pending'), { target: { value: 'won' } });
    fireEvent.click(screen.getByText('Apply To Selected'));

    await waitFor(() => {
      expect(tipsService.updateJackpot).toHaveBeenCalledTimes(2);
    });

    expect(tipsService.updateJackpot).toHaveBeenCalledWith('1', { result: 'won' });
    expect(tipsService.updateJackpot).toHaveBeenCalledWith('2', { result: 'won' });
  });

  it('includes jackpot promo fields in the create payload', async () => {
    vi.mocked(tipsService.addJackpot).mockResolvedValue({
      id: '3',
      type: 'midweek',
      dcLevel: 3,
      matches: Array.from({ length: 13 }, (_, i) => ({ homeTeam: `Home ${i}`, awayTeam: `Away ${i}` })),
      variations: [Array.from({ length: 13 }, () => '1')],
      price: 0,
      result: 'pending',
      displayDate: '2026-04-18',
      promoImageUrl: '/media/uploads/jackpot-promo.jpg',
      promoTitle: "This Week's Midweek Jackpot",
      promoCaption: 'Poster before free prediction',
      promoOnly: true,
      createdAt: '2026-04-14T10:00:00Z',
      updatedAt: '2026-04-14T10:00:00Z',
      regional_prices: { international: { price: 0 } },
    } as any);

    const { container } = render(<JackpotsManagePage />);

    await screen.findByText(/Jackpot Management/i);
    fireEvent.click(screen.getByText(/New Jackpot/i));

    fireEvent.change(screen.getByLabelText(/Jackpot Date/i), { target: { value: '2026-04-18' } });
    fireEvent.change(screen.getByLabelText(/Promo Title/i), { target: { value: "This Week's Midweek Jackpot" } });
    fireEvent.change(screen.getByLabelText(/Promo Caption/i), { target: { value: 'Poster before free prediction' } });
    fireEvent.change(screen.getByLabelText(/Promo Image URL/i), { target: { value: '/media/uploads/jackpot-promo.jpg' } });
    fireEvent.click(screen.getByLabelText(/Promo Only/i));

    fireEvent.click(screen.getByText(/Toggle/i));
    fireEvent.click(screen.getByText(/Publish Jackpot/i));

    await waitFor(() => {
      expect(tipsService.addJackpot).toHaveBeenCalled();
    });

    expect(tipsService.addJackpot).toHaveBeenCalledWith(
      expect.objectContaining({
        displayDate: '2026-04-18',
        promoImageUrl: '/media/uploads/jackpot-promo.jpg',
        promoTitle: "This Week's Midweek Jackpot",
        promoCaption: 'Poster before free prediction',
        promoOnly: true,
      })
    );
  });
});
