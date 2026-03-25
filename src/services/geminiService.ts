import { GoogleGenAI, Type } from '@google/genai';
import { FixtureData, PredictionData } from '../types';

export async function generatePredictions(fixtures: FixtureData[]): Promise<PredictionData[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing.');
  }

  if (fixtures.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  You are an expert sports betting analyst. I will provide you with a list of real upcoming or live soccer matches.
  For each match, provide a betting prediction, estimated odds from 3 bookmakers (specifically Betika, SportPesa, and Betway), confidence rating (1-5), reasoning, 3 key stats, head-to-head summary, recent form, and detailed team stats (average goals scored, conceded, and clean sheets for both teams).

  Matches:
  ${fixtures.map(f => `ID: ${f.id} | ${f.homeTeam} vs ${f.awayTeam} | League: ${f.league}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fixtureId: { type: Type.NUMBER, description: 'The ID of the fixture provided in the prompt' },
              prediction: { type: Type.STRING, description: 'The betting prediction (e.g., Home Win, Over 2.5 Goals)' },
              odds: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    bookmaker: { type: Type.STRING, description: 'Name of bookmaker (e.g., Betika)' },
                    value: { type: Type.STRING, description: 'Odds value (e.g., 1.85)' }
                  },
                  required: ['bookmaker', 'value']
                }
              },
              confidenceStars: { type: Type.NUMBER, description: 'Confidence level from 1 to 5' },
              reasoning: { type: Type.STRING, description: 'Brief reasoning for the prediction' },
              keyStats: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 key statistical facts or trends relevant to the match'
              },
              h2h: { type: Type.STRING, description: 'Brief Head-to-Head summary' },
              form: {
                type: Type.OBJECT,
                properties: {
                  home: { type: Type.STRING, description: 'Home team recent form (e.g., W-W-D-L-W)' },
                  away: { type: Type.STRING, description: 'Away team recent form' }
                },
                required: ['home', 'away']
              },
              homeStats: {
                type: Type.OBJECT,
                properties: {
                  avgGoalsScored: { type: Type.NUMBER, description: 'Average goals scored per match' },
                  avgGoalsConceded: { type: Type.NUMBER, description: 'Average goals conceded per match' },
                  cleanSheets: { type: Type.NUMBER, description: 'Number of clean sheets' }
                },
                required: ['avgGoalsScored', 'avgGoalsConceded', 'cleanSheets']
              },
              awayStats: {
                type: Type.OBJECT,
                properties: {
                  avgGoalsScored: { type: Type.NUMBER, description: 'Average goals scored per match' },
                  avgGoalsConceded: { type: Type.NUMBER, description: 'Average goals conceded per match' },
                  cleanSheets: { type: Type.NUMBER, description: 'Number of clean sheets' }
                },
                required: ['avgGoalsScored', 'avgGoalsConceded', 'cleanSheets']
              }
            },
            required: ['fixtureId', 'prediction', 'odds', 'confidenceStars', 'reasoning', 'keyStats', 'h2h', 'form', 'homeStats', 'awayStats']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('Error generating predictions:', error);
    const errorString = error?.toString() || '';
    if (
      error?.status === 429 || 
      error?.status === 'RESOURCE_EXHAUSTED' || 
      errorString.includes('429') || 
      errorString.includes('RESOURCE_EXHAUSTED')
    ) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    throw error;
  }
}

