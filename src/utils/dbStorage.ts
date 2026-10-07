/**
 * Persistent IndexedDB Storage Engine for ColorCraft
 * Uses a lightweight IndexedDB wrapper (idb-keyval) to store large coloring book objects,
 * including high-resolution base64 image strings, SVG vectors, custom stickers,
 * borders, certificates, and audio recordings without localStorage's 5MB quota limit.
 */

import { get, set, del, clear, createStore } from 'idb-keyval';
import { ColoringBook, FavoriteBook } from '../types';

// Dedicated IndexedDB custom stores
export const bookStore = createStore('ColorCraftDB', 'coloring_books');
export const consentStore = createStore('ColorCraftDB', 'privacy_consent');

const KEY_AUTOSAVE = 'autosaved_session_current';
const KEY_FAVORITES = 'favorites_collection';
const KEY_HISTORY = 'session_history_books';
const KEY_PARENTAL_CONSENT = 'parental_consent_record';

export interface ParentalConsentRecord {
  granted: boolean;
  timestamp: number;
  childName?: string;
  guardianType?: 'parent' | 'guardian' | 'educator';
  version: string;
}

// In-memory fast caches to keep synchronous UI reads instantaneous and avoid flickers
let cachedAutosave: { book: ColoringBook; savedAt: number } | null = null;
let cachedFavorites: FavoriteBook[] = [];
let cachedHistory: ColoringBook[] = [];
let cachedConsent: ParentalConsentRecord | null = null;
let isInitialized = false;

/**
 * Initialize storage from IndexedDB on startup and migrate legacy localStorage if found.
 */
export async function initStorage(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // 1. Load Autosaved Session from IndexedDB
    const idbAutosave = await get<{ book: ColoringBook; savedAt: number }>(KEY_AUTOSAVE, bookStore);
    if (idbAutosave && idbAutosave.book && Array.isArray(idbAutosave.book.pages)) {
      cachedAutosave = idbAutosave;
    } else if (typeof localStorage !== 'undefined') {
      // Legacy migration from localStorage
      try {
        const raw = localStorage.getItem('coloring_book_autosaved_session_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.book && Array.isArray(parsed.book.pages)) {
            cachedAutosave = parsed;
            await set(KEY_AUTOSAVE, parsed, bookStore);
            // Clean up localStorage to prevent quota exhaustion
            localStorage.removeItem('coloring_book_autosaved_session_v1');
          }
        }
      } catch (e) {
        console.warn('Legacy autosave migration skipped:', e);
      }
    }

    // 2. Load Favorites from IndexedDB
    const idbFavorites = await get<FavoriteBook[]>(KEY_FAVORITES, bookStore);
    if (Array.isArray(idbFavorites) && idbFavorites.length > 0) {
      cachedFavorites = idbFavorites;
    } else if (typeof localStorage !== 'undefined') {
      // Legacy migration from localStorage
      try {
        const rawFav = localStorage.getItem('coloring_book_favorites_v1');
        if (rawFav) {
          const parsed = JSON.parse(rawFav);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedFavorites = parsed;
            await set(KEY_FAVORITES, parsed, bookStore);
            // Clean up localStorage to free quota
            localStorage.removeItem('coloring_book_favorites_v1');
          }
        }
      } catch (e) {
        console.warn('Legacy favorites migration skipped:', e);
      }
    }

    // 3. Load Session History from IndexedDB
    const idbHistory = await get<ColoringBook[]>(KEY_HISTORY, bookStore);
    if (Array.isArray(idbHistory) && idbHistory.length > 0) {
      cachedHistory = idbHistory;
    } else if (typeof sessionStorage !== 'undefined') {
      // Legacy migration from sessionStorage
      try {
        const rawHist = sessionStorage.getItem('coloring_book_session_history_v1');
        if (rawHist) {
          const parsed = JSON.parse(rawHist);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedHistory = parsed;
            await set(KEY_HISTORY, parsed, bookStore);
            sessionStorage.removeItem('coloring_book_session_history_v1');
          }
        }
      } catch (e) {
        console.warn('Legacy history migration skipped:', e);
      }
    }

    // 4. Load Parental Consent from IndexedDB
    const idbConsent = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, consentStore);
    if (idbConsent && idbConsent.granted) {
      cachedConsent = idbConsent;
    } else if (typeof localStorage !== 'undefined') {
      // Legacy check
      try {
        const rawConsent = localStorage.getItem('colorcraft_parental_consent_v1');
        if (rawConsent === 'true') {
          cachedConsent = {
            granted: true,
            timestamp: Date.now(),
            version: '1.0',
          };
          await set(KEY_PARENTAL_CONSENT, cachedConsent, consentStore);
          localStorage.removeItem('colorcraft_parental_consent_v1');
        }
      } catch (e) {}
    }

    // Broadcast initialization complete
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_storage_ready'));
      if (cachedAutosave) {
        window.dispatchEvent(
          new CustomEvent('coloring_book_autosave_updated', { detail: cachedAutosave })
        );
      }
      if (cachedFavorites.length > 0) {
        window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
      }
      if (cachedHistory.length > 0) {
        window.dispatchEvent(
          new CustomEvent('coloring_book_session_history_updated', { detail: cachedHistory })
        );
      }
      if (cachedConsent?.granted) {
        window.dispatchEvent(
          new CustomEvent('parental_consent_updated', { detail: cachedConsent })
        );
      }
    }
  } catch (err) {
    console.warn('IndexedDB initialization encountered an issue, fallback to memory cache:', err);
  }
}

// Automatically initiate background initialization in browser
if (typeof window !== 'undefined') {
  initStorage().catch((err) => {
    console.warn('Storage initialisation error:', err);
  });
}

/* ================= AUTOSAVE OPERATIONS (INDEXEDDB) ================= */

export async function saveAutosaveToDb(book: ColoringBook, savedAt = Date.now()): Promise<boolean> {
  if (!book || !book.id) return false;

  const session = { book, savedAt };
  cachedAutosave = session;

  try {
    await set(KEY_AUTOSAVE, session, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_autosave_updated', { detail: session }));
    }
    return true;
  } catch (err) {
    console.warn('Persistent IndexedDB autosave failed (held in memory cache):', err);
    return false;
  }
}

export function getAutosavedSessionSync(): { book: ColoringBook; savedAt: number } | null {
  return cachedAutosave;
}

export async function getAutosavedSessionAsync(): Promise<{ book: ColoringBook; savedAt: number } | null> {
  try {
    const data = await get<{ book: ColoringBook; savedAt: number }>(KEY_AUTOSAVE, bookStore);
    if (data && data.book) {
      cachedAutosave = data;
      return data;
    }
  } catch (e) {
    console.warn('Async get autosave failed:', e);
  }
  return cachedAutosave;
}

export async function clearAutosaveInDb(): Promise<void> {
  cachedAutosave = null;
  try {
    await del(KEY_AUTOSAVE, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_autosave_cleared'));
    }
  } catch (err) {
    console.warn('Error clearing autosave in IndexedDB:', err);
  }
}

/* ================= FAVORITES OPERATIONS (INDEXEDDB) ================= */

export async function saveFavoriteToDb(book: ColoringBook | FavoriteBook): Promise<FavoriteBook> {
  const currentFavs = [...cachedFavorites];
  const existingIdx = currentFavs.findIndex(
    (fav) => fav.id === book.id || (fav.theme === book.theme && fav.childName === book.childName)
  );

  const favoriteItem: FavoriteBook = {
    id: book.id || `fav-${Date.now()}`,
    savedAt: Date.now(),
    theme: book.theme,
    childName: book.childName,
    title: book.title,
    subtitle: book.subtitle,
    dedication: book.dedication,
    difficulty: book.difficulty,
    resolution: book.resolution,
    aspectRatio: book.aspectRatio,
    pageCount: (book as any).pages?.length || (book as any).pageCount || 5,
    coverImageUrl: book.coverImageUrl,
    pages: (book as any).pages || [],
    stickerSheet: book.stickerSheet,
    defaultBorderStyle: book.defaultBorderStyle,
    includeCertificate: book.includeCertificate,
    certificateDetails: book.certificateDetails,
    includeQrCode: book.includeQrCode,
    includeDrawYourEnding: book.includeDrawYourEnding,
    includeCrayonSwatches: book.includeCrayonSwatches,
    printLayout: book.printLayout,
    heroPhotoUrl: book.heroPhotoUrl,
    heroSubjectType: book.heroSubjectType,
    brandIntegration: book.brandIntegration,
    language: book.language,
    secondaryLanguage: book.secondaryLanguage,
    activityMode: book.activityMode,
    dedicationAuthor: book.dedicationAuthor,
  };

  if (existingIdx >= 0) {
    currentFavs[existingIdx] = favoriteItem;
  } else {
    currentFavs.unshift(favoriteItem);
  }

  cachedFavorites = currentFavs;

  try {
    await set(KEY_FAVORITES, currentFavs, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
    }
  } catch (err) {
    console.warn('IndexedDB favorite write failed, saved in memory cache:', err);
  }

  return favoriteItem;
}

export function getFavoritesSync(): FavoriteBook[] {
  return cachedFavorites;
}

export async function getFavoritesAsync(): Promise<FavoriteBook[]> {
  try {
    const list = await get<FavoriteBook[]>(KEY_FAVORITES, bookStore);
    if (Array.isArray(list)) {
      cachedFavorites = list;
      return list;
    }
  } catch (e) {
    console.warn('Async get favorites failed:', e);
  }
  return cachedFavorites;
}

export async function removeFavoriteFromDb(favoriteId: string): Promise<void> {
  cachedFavorites = cachedFavorites.filter((fav) => fav.id !== favoriteId);

  try {
    await set(KEY_FAVORITES, cachedFavorites, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
    }
  } catch (err) {
    console.warn('IndexedDB remove favorite failed:', err);
  }
}

export function isFavoriteSync(bookId?: string, theme?: string, childName?: string): boolean {
  if (!bookId && !theme) return false;
  return cachedFavorites.some(
    (fav) =>
      (bookId && fav.id === bookId) ||
      (theme &&
        fav.theme?.toLowerCase() === theme.toLowerCase() &&
        (!childName || fav.childName?.toLowerCase() === childName.toLowerCase()))
  );
}

/* ================= HISTORY OPERATIONS (INDEXEDDB) ================= */

export const MAX_HISTORY_ITEMS = 6;

export function getHistorySync(): ColoringBook[] {
  return cachedHistory;
}

export async function getHistoryAsync(): Promise<ColoringBook[]> {
  try {
    const list = await get<ColoringBook[]>(KEY_HISTORY, bookStore);
    if (Array.isArray(list)) {
      cachedHistory = list;
      return list;
    }
  } catch (e) {
    console.warn('Async get history failed:', e);
  }
  return cachedHistory;
}

export async function addHistoryBookToDb(book: ColoringBook): Promise<ColoringBook[]> {
  if (!book || !book.id) return cachedHistory;

  const current = [...cachedHistory];
  const filtered = current.filter(
    (item) =>
      item.id !== book.id &&
      !(item.theme === book.theme && item.childName === book.childName && item.title === book.title)
  );

  const updated = [book, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  cachedHistory = updated;

  try {
    await set(KEY_HISTORY, updated, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coloring_book_session_history_updated', { detail: updated })
      );
    }
  } catch (err) {
    console.warn('IndexedDB session history write failed:', err);
  }

  return updated;
}

export async function removeHistoryBookFromDb(bookId: string): Promise<ColoringBook[]> {
  const updated = cachedHistory.filter((item) => item.id !== bookId);
  cachedHistory = updated;

  try {
    await set(KEY_HISTORY, updated, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coloring_book_session_history_updated', { detail: updated })
      );
    }
  } catch (err) {
    console.warn('IndexedDB remove history book failed:', err);
  }

  return updated;
}

export async function clearHistoryInDb(): Promise<void> {
  cachedHistory = [];
  try {
    await del(KEY_HISTORY, bookStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coloring_book_session_history_updated', { detail: [] })
      );
    }
  } catch (err) {
    console.warn('IndexedDB clear history failed:', err);
  }
}

/* ================= PARENTAL CONSENT OPERATIONS (INDEXEDDB) ================= */

export function getParentalConsentSync(): boolean {
  return cachedConsent?.granted === true;
}

export function getParentalConsentRecordSync(): ParentalConsentRecord | null {
  return cachedConsent;
}

export async function getParentalConsentAsync(): Promise<boolean> {
  try {
    const record = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, consentStore);
    if (record && record.granted) {
      cachedConsent = record;
      return true;
    }
  } catch (e) {
    console.warn('Async get consent failed:', e);
  }
  return cachedConsent?.granted === true;
}

export async function saveParentalConsentAsync(details?: {
  childName?: string;
  guardianType?: 'parent' | 'guardian' | 'educator';
}): Promise<ParentalConsentRecord> {
  const record: ParentalConsentRecord = {
    granted: true,
    timestamp: Date.now(),
    childName: details?.childName,
    guardianType: details?.guardianType || 'parent',
    version: '1.0',
  };

  cachedConsent = record;

  try {
    await set(KEY_PARENTAL_CONSENT, record, consentStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('parental_consent_updated', { detail: record }));
    }
  } catch (err) {
    console.warn('Failed to save parental consent in IndexedDB:', err);
  }

  return record;
}

export async function revokeParentalConsentAsync(): Promise<void> {
  cachedConsent = null;
  try {
    await del(KEY_PARENTAL_CONSENT, consentStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('parental_consent_updated', { detail: null }));
    }
  } catch (err) {
    console.warn('Failed to revoke parental consent in IndexedDB:', err);
  }
}
