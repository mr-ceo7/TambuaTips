/**
 * Simple caching layer using localStorage + in-memory fallback.
 * Supports TTL-based expiration.
 */

const CACHE_PREFIX = 'tambuatips_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache for faster reads within same session
const memoryCache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const fullKey = CACHE_PREFIX + key;
  
  // Check memory first
  const memEntry = memoryCache.get(fullKey);
  if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
    return memEntry.data as T;
  }
  
  // Check localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp < entry.ttl) {
      // Restore to memory cache
      memoryCache.set(fullKey, entry);
      return entry.data;
    }
    
    // Expired — clean up
    localStorage.removeItem(fullKey);
    memoryCache.delete(fullKey);
  } catch {
    // Corrupted cache entry
  }
  
  return null;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  const fullKey = CACHE_PREFIX + key;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  
  memoryCache.set(fullKey, entry);
  
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // localStorage might be full — memory cache still works
  }
}

export function clearCache(pattern?: string): void {
  if (pattern) {
    const fullPattern = CACHE_PREFIX + pattern;
    // Clear matching keys
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(fullPattern)) {
        localStorage.removeItem(key);
      }
    }
    for (const key of memoryCache.keys()) {
      if (key.startsWith(fullPattern)) {
        memoryCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    memoryCache.clear();
  }
}

// Cache TTL constants
export const CACHE_TTL = {
  FIXTURES: 60 * 60 * 1000,        // 1 hour
  STANDINGS: 6 * 60 * 60 * 1000,   // 6 hours  
  LIVE_SCORES: 60 * 1000,          // 1 minute
  NEWS: 60 * 60 * 1000,            // 1 hour
  H2H: 2 * 60 * 60 * 1000,        // 2 hours
} as const;
