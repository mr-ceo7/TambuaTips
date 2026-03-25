/**
 * API Key Rotator for API-Football
 * Manages multiple API keys and rotates between them to maximize daily request limits.
 * Tracks usage per key in localStorage to persist across page reloads.
 */

const STORAGE_KEY = 'tambuatips_api_usage';
const DAILY_LIMIT_PER_KEY = 100;

interface KeyUsage {
  count: number;
  date: string; // YYYY-MM-DD
}

function getKeys(): string[] {
  const keysStr = import.meta.env.VITE_API_FOOTBALL_KEYS || '';
  const singleKey = import.meta.env.VITE_API_FOOTBALL_KEY || '';
  
  if (keysStr) {
    return keysStr.split(',').map((k: string) => k.trim()).filter(Boolean);
  }
  if (singleKey) {
    return [singleKey.trim()];
  }
  return [];
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function loadUsage(): Record<string, KeyUsage> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveUsage(usage: Record<string, KeyUsage>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

function getKeyUsageToday(key: string): number {
  const usage = loadUsage();
  const entry = usage[key];
  if (!entry || entry.date !== getTodayStr()) return 0;
  return entry.count;
}

function incrementKeyUsage(key: string): void {
  const usage = loadUsage();
  const today = getTodayStr();
  const entry = usage[key];
  
  if (!entry || entry.date !== today) {
    usage[key] = { count: 1, date: today };
  } else {
    usage[key] = { count: entry.count + 1, date: today };
  }
  saveUsage(usage);
}

/**
 * Get the best available API key (one with the most remaining requests today).
 * Returns null if all keys are exhausted.
 */
export function getAvailableKey(): string | null {
  const keys = getKeys();
  if (keys.length === 0) return null;
  
  const today = getTodayStr();
  const usage = loadUsage();
  
  // Find key with lowest usage today
  let bestKey: string | null = null;
  let lowestUsage = Infinity;
  
  for (const key of keys) {
    const entry = usage[key];
    const count = (entry && entry.date === today) ? entry.count : 0;
    if (count < DAILY_LIMIT_PER_KEY && count < lowestUsage) {
      lowestUsage = count;
      bestKey = key;
    }
  }
  
  return bestKey;
}

/**
 * Make a request to API-Football with automatic key rotation.
 * Tries the least-used key first, falls back to others if rate-limited.
 */
export async function apiFetch(endpoint: string): Promise<any> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('MISSING_API_KEY');
  
  const today = getTodayStr();
  const usage = loadUsage();
  
  // Sort keys by usage (least used first)
  const sortedKeys = [...keys].sort((a, b) => {
    const aCount = (usage[a] && usage[a].date === today) ? usage[a].count : 0;
    const bCount = (usage[b] && usage[b].date === today) ? usage[b].count : 0;
    return aCount - bCount;
  });
  
  for (const key of sortedKeys) {
    const count = getKeyUsageToday(key);
    if (count >= DAILY_LIMIT_PER_KEY) continue;
    
    try {
      const response = await fetch(`https://v3.football.api-sports.io${endpoint}`, {
        headers: { 'x-apisports-key': key }
      });
      
      incrementKeyUsage(key);
      
      if (response.status === 429) {
        // Rate limited, try next key
        console.warn(`API key ...${key.slice(-4)} rate limited, rotating...`);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err: any) {
      if (err.message?.includes('rate') || err.message?.includes('429')) {
        console.warn(`API key ...${key.slice(-4)} failed, trying next...`);
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('ALL_KEYS_EXHAUSTED');
}

/**
 * Get total remaining requests across all keys for today.
 */
export function getRemainingRequests(): number {
  const keys = getKeys();
  const today = getTodayStr();
  const usage = loadUsage();
  
  return keys.reduce((total, key) => {
    const entry = usage[key];
    const count = (entry && entry.date === today) ? entry.count : 0;
    return total + Math.max(0, DAILY_LIMIT_PER_KEY - count);
  }, 0);
}

/**
 * Get the total daily limit across all keys.
 */
export function getTotalDailyLimit(): number {
  return getKeys().length * DAILY_LIMIT_PER_KEY;
}
