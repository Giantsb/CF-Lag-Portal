import { MemberData, WodEntry, Announcement } from '../types';

/**
 * 24 Hours in Milliseconds
 */
export const WOD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Universal Cache Entry with Timestamp and ExpiresAt
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number; // Unix epoch ms when saved
  expiresAt?: number; // Unix epoch ms when entry expires
}

/**
 * LocalStorage keys for caching
 */
export const CACHE_KEYS = {
  MEMBER: 'cflagos_cached_member_data',
  WOD_TODAY: 'cflagos_cached_wod_today',
  WOD_HISTORY: 'cflagos_cached_wod_history',
  PAUSE_STATUS: 'cflagos_cached_pause_status',
  ANNOUNCEMENTS: 'cflagos_cached_announcements'
};

/**
 * Generic getter from localStorage with error safety
 */
export function getCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.timestamp === 'number' && 'data' in parsed) {
      return parsed as CacheEntry<T>;
    }
    return null;
  } catch (e) {
    console.warn(`[Cache] Failed to read ${key}:`, e);
    return null;
  }
}

/**
 * Generic setter to localStorage with error safety and optional TTL
 */
export function setCache<T>(key: string, data: T, ttlMs?: number): void {
  try {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ...(ttlMs ? { expiresAt: now + ttlMs } : {})
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn(`[Cache] Failed to write ${key}:`, e);
  }
}

/**
 * Check if a cache entry is expired (older than expiresAt or 24 hours)
 */
export function isCacheExpired<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return true;
  const now = Date.now();
  if (typeof entry.expiresAt === 'number') {
    return now > entry.expiresAt;
  }
  // Fallback for entries created before expiresAt was introduced: check 24-hour limit against timestamp
  if (typeof entry.timestamp === 'number') {
    return now - entry.timestamp > WOD_CACHE_TTL_MS;
  }
  return true;
}

/**
 * Remove an item from cache
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

/**
 * Helper to format timestamp into human-readable relative time
 */
export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

// ============================================================================
// Member Data Specific Cache
// ============================================================================

export function getCachedMember(expectedPhone?: string): CacheEntry<MemberData> | null {
  const cached = getCache<MemberData>(CACHE_KEYS.MEMBER);
  if (!cached || !cached.data) return null;

  if (expectedPhone) {
    const cleanExpected = expectedPhone.replace(/[\s\-\(\)\+]/g, '').slice(-10);
    const cleanCached = (cached.data.phone || '').toString().replace(/[\s\-\(\)\+]/g, '').slice(-10);
    if (cleanExpected && cleanCached && cleanExpected !== cleanCached) {
      return null;
    }
  }

  return cached;
}

export function setCachedMember(member: MemberData): void {
  if (!member) return;
  setCache(CACHE_KEYS.MEMBER, member);
}

export function clearCachedMember(): void {
  removeCache(CACHE_KEYS.MEMBER);
}

// ============================================================================
// WOD Specific Cache
// ============================================================================

export interface WodTodayCachePayload {
  entry: WodEntry | null;
  isRestDay: boolean;
}

export function getCachedWodToday(): CacheEntry<WodTodayCachePayload> | null {
  return getCache<WodTodayCachePayload>(CACHE_KEYS.WOD_TODAY);
}

export function setCachedWodToday(entry: WodEntry | null, isRestDay: boolean, ttlMs: number = WOD_CACHE_TTL_MS): void {
  setCache(CACHE_KEYS.WOD_TODAY, { entry, isRestDay }, ttlMs);
}

export function getCachedWodHistory(): CacheEntry<WodEntry[]> | null {
  return getCache<WodEntry[]>(CACHE_KEYS.WOD_HISTORY);
}

export function setCachedWodHistory(history: WodEntry[], ttlMs: number = WOD_CACHE_TTL_MS): void {
  setCache(CACHE_KEYS.WOD_HISTORY, history || [], ttlMs);
}

// ============================================================================
// Pause Status Cache
// ============================================================================

export interface PauseStatusCachePayload {
  status: string;
  date?: string;
}

export function getCachedPauseStatus(phone?: string): CacheEntry<PauseStatusCachePayload> | null {
  const key = phone ? `${CACHE_KEYS.PAUSE_STATUS}_${phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)}` : CACHE_KEYS.PAUSE_STATUS;
  return getCache<PauseStatusCachePayload>(key);
}

export function setCachedPauseStatus(phone: string, payload: PauseStatusCachePayload): void {
  const key = phone ? `${CACHE_KEYS.PAUSE_STATUS}_${phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)}` : CACHE_KEYS.PAUSE_STATUS;
  setCache(key, payload);
}

// ============================================================================
// Announcements Cache
// ============================================================================

export function getCachedAnnouncements(): CacheEntry<Announcement[]> | null {
  return getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS);
}

export function setCachedAnnouncements(announcements: Announcement[]): void {
  setCache(CACHE_KEYS.ANNOUNCEMENTS, announcements || []);
}
