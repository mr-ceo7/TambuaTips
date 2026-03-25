import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePredictions } from './geminiService';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: {
          generateContent: vi.fn(),
        },
      };
    }),
    Type: {
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
    },
  };
});

describe('geminiService', () => {
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    
    mockGenerateContent = vi.fn();
    (GoogleGenAI as any).mockImplementation(function() {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    });
  });

  it('throws error if API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generatePredictions([])).rejects.toThrow('Gemini API key is missing.');
  });

  it('returns empty array if fixtures are empty', async () => {
    const predictions = await generatePredictions([]);
    expect(predictions).toEqual([]);
  });

  it('returns parsed predictions on success', async () => {
    const mockResponse = {
      text: JSON.stringify([
        {
          fixtureId: 1,
          prediction: 'Home Win',
          odds: [{ bookmaker: 'Betika', value: '1.5' }],
          confidenceStars: 4,
          reasoning: 'Better team',
          keyStats: ['Team A scores 2 goals per game', 'Team B concedes 1.5 goals per game'],
          h2h: 'Team A won last 3',
          form: { home: 'W-W-W', away: 'L-L-L' }
        },
      ]),
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const fixtures = [
      {
        id: 1,
        sport: 'Soccer',
        league: 'EPL',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        matchDate: '2026-03-25T15:00:00Z',
        status: 'upcoming' as const
      }
    ];

    const predictions = await generatePredictions(fixtures);
    expect(predictions).toHaveLength(1);
    expect(predictions[0].fixtureId).toBe(1);
    expect(predictions[0].prediction).toBe('Home Win');
  });

  it('returns empty array if text is empty', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' });
    const fixtures = [
      {
        id: 1,
        sport: 'Soccer',
        league: 'EPL',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        matchDate: '2026-03-25T15:00:00Z',
        status: 'upcoming' as const
      }
    ];
    const predictions = await generatePredictions(fixtures);
    expect(predictions).toEqual([]);
  });
});
