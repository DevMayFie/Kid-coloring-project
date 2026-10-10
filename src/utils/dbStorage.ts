/**
 * Persistent IndexedDB Storage Engine for ColorCraft
 * Uses a lightweight IndexedDB wrapper (idb-keyval) to store large coloring book objects,
 * including high-resolution base64 image strings, SVG vectors, custom stickers,
 * borders, certificates, and audio recordings without localStorage's 5MB quota limit.
 */

import { get, set, del, clear } from 'idb-keyval';
import { ColoringBook, FavoriteBook } from '../types';

/**
 * Safe IndexedDB store creator that automatically inspects existing databases,
 * detects missing object stores, and performs safe schema upgrades (incrementing DB version)
 * to ensure all required object stores exist.
 *
 * This eliminates:
 * NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
 */
export function createSafeStore(
  dbName: string,
  storeName: string,
  allRequiredStores: string[] = ['coloring_books', 'privacy_consent', 'keyval']
) {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const getDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not supported in this environment'));
      }

      const openReq = indexedDB.open(dbName);

      openReq.onerror = () => {
        dbPromise = null;
        reject(openReq.error || new Error(`Failed to open IndexedDB "${dbName}"`));
      };

      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        for (const s of allRequiredStores) {
          if (db.objectStoreNames && typeof db.objectStoreNames.contains === 'function') {
            if (!db.objectStoreNames.contains(s)) {
              try {
                db.createObjectStore(s);
              } catch {}
            }
          }
        }
      };

      openReq.onsuccess = () => {
        const db = openReq.result;

        db.onversionchange = () => {
          try {
            db.close();
          } catch {}
          dbPromise = null;
        };

        db.onclose = () => {
          dbPromise = null;
        };

        const hasStoreNames = db.objectStoreNames && typeof db.objectStoreNames.contains === 'function';
        const missingStores = hasStoreNames
          ? allRequiredStores.filter((s) => !db.objectStoreNames.contains(s))
          : [];

        if (missingStores.length === 0 || !hasStoreNames) {
          resolve(db);
          return;
        }

        // Schema upgrade needed to add missing object stores without losing existing data!
        const nextVersion = (db.version || 1) + 1;
        try {
          db.close();
        } catch {}

        const upgradeReq = indexedDB.open(dbName, nextVersion);

        upgradeReq.onerror = () => {
          dbPromise = null;
          reject(upgradeReq.error || new Error(`Failed to upgrade IndexedDB "${dbName}" to v${nextVersion}`));
        };

        upgradeReq.onupgradeneeded = () => {
          const upDb = upgradeReq.result;
          for (const s of allRequiredStores) {
            if (upDb.objectStoreNames && !upDb.objectStoreNames.contains(s)) {
              try {
                upDb.createObjectStore(s);
              } catch {}
            }
          }
        };

        upgradeReq.onsuccess = () => {
          const upDb = upgradeReq.result;
          upDb.onversionchange = () => {
            try {
              upDb.close();
            } catch {}
            dbPromise = null;
          };
          upDb.onclose = () => {
            dbPromise = null;
          };
          resolve(upDb);
        };
      };
    });

    return dbPromise;
  };

  return <T>(txMode: IDBTransactionMode, callback: (store: IDBObjectStore) => T | PromiseLike<T>): Promise<T> => {
    return getDB().then(async (db) => {
      try {
        return await callback(db.transaction(storeName, txMode).objectStore(storeName));
      } catch (err: any) {
        const isNotFoundError =
          err &&
          (err.name === 'NotFoundError' ||
            String(err).includes('One of the specified object stores was not found') ||
            String(err).includes('NotFoundError'));

        if (isNotFoundError) {
          // Self-heal: Force database version upgrade to create missing store
          dbPromise = null;
          try {
            db.close();
          } catch {}

          const nextVersion = (db.version || 1) + 1;
          const healedDb = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(dbName, nextVersion);
            req.onerror = () => reject(req.error);
            req.onupgradeneeded = () => {
              const uDb = req.result;
              for (const s of allRequiredStores) {
                if (uDb.objectStoreNames && !uDb.objectStoreNames.contains(s)) {
                  try {
                    uDb.createObjectStore(s);
                  } catch {}
                }
              }
            };
            req.onsuccess = () => resolve(req.result);
          });

          dbPromise = Promise.resolve(healedDb);
          return callback(healedDb.transaction(storeName, txMode).objectStore(storeName));
        }

        throw err;
      }
    });
  };
}

// Dedicated IndexedDB custom stores with auto-healing and schema synchronization
export const bookStore = createSafeStore('ColorCraftDB', 'coloring_books', ['coloring_books', 'privacy_consent', 'keyval']);
export const consentStore = createSafeStore('ColorCraftDB', 'privacy_consent', ['coloring_books', 'privacy_consent', 'keyval']);

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
  consentToken?: string;
}

// In-memory fast caches to keep synchronous UI reads instantaneous and avoid flickers
let cachedAutosave: { book: ColoringBook; savedAt: number } | null = null;
let cachedFavorites: FavoriteBook[] = [];
let cachedHistory: ColoringBook[] = [];
let cachedConsent: ParentalConsentRecord | null = null;
let isInitialized = false;
let initError: Error | null = null;
let initPromise: Promise<void> | null = null;

// Mutex queue to serialize write operations and prevent read-modify-write race conditions
let writeQueue: Promise<any> = Promise.resolve();

function enqueueWrite<T>(op: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(op, op);
  writeQueue = result.catch(() => {});
  return result;
}

/**
 * Ensures storage initialization has fully resolved before executing reads/writes.
 * All callers share the exact same underlying initialization promise.
 */
export function storageReady(): Promise<void> {
  return initStorage();
}

/**
 * Returns true if IndexedDB has completed hydration into memory cache without errors.
 */
export function isStorageHydrated(): boolean {
  return isInitialized && initError === null;
}

/**
 * Retrieves storage initialization error if any occurred.
 */
export function getStorageInitError(): Error | null {
  return initError;
}

/**
 * Initialize storage from IndexedDB on startup and migrate legacy localStorage if found.
 * Thread-safe: All callers share the exact same initialization promise.
 */
export function initStorage(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
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
      try {
        let idbConsent: ParentalConsentRecord | undefined;
        try {
          idbConsent = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, consentStore);
        } catch {
          // Fallback check if stored in bookStore
          try {
            idbConsent = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, bookStore);
          } catch {}
        }

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
              await set(KEY_PARENTAL_CONSENT, cachedConsent, consentStore).catch(() => {});
              localStorage.removeItem('colorcraft_parental_consent_v1');
            }
          } catch (e) {}
        }
      } catch (consentErr) {
        console.warn('Parental consent load non-fatal warning:', consentErr);
      }

      // Mark hydration as fully completed ONLY after all records are loaded
      isInitialized = true;
      initError = null;

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
    } catch (err: any) {
      console.error('Critical: IndexedDB storage initialization failed:', err);
      // DO NOT mark isInitialized as true! Protect existing saved projects from being overwritten!
      isInitialized = false;
      initError = err instanceof Error ? err : new Error(String(err));
      // Reset initPromise so a retry can be attempted later
      initPromise = null;
      throw initError;
    }
  })();

  return initPromise;
}

// Automatically initiate background initialization in browser
if (typeof window !== 'undefined') {
  initStorage().catch((err) => {
    console.warn('Background storage initialization warning:', err);
  });
}

/* ================= AUTOSAVE OPERATIONS (INDEXEDDB) ================= */

export async function saveAutosaveToDb(book: ColoringBook, savedAt = Date.now()): Promise<boolean> {
  if (!book || !book.id) return false;
  await storageReady();

  return enqueueWrite(async () => {
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
  });
}

export function getAutosavedSessionSync(): { book: ColoringBook; savedAt: number } | null {
  return cachedAutosave;
}

export async function getAutosavedSessionAsync(): Promise<{ book: ColoringBook; savedAt: number } | null> {
  await storageReady();
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
  await storageReady();
  return enqueueWrite(async () => {
    cachedAutosave = null;
    try {
      await del(KEY_AUTOSAVE, bookStore);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('coloring_book_autosave_cleared'));
      }
    } catch (err) {
      console.warn('Error clearing autosave in IndexedDB:', err);
    }
  });
}

/* ================= FAVORITES OPERATIONS (INDEXEDDB) ================= */

export async function saveFavoriteToDb(book: ColoringBook | FavoriteBook): Promise<FavoriteBook> {
  await storageReady();

  return enqueueWrite(async () => {
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
  });
}

export function getFavoritesSync(): FavoriteBook[] {
  return cachedFavorites;
}

export async function getFavoritesAsync(): Promise<FavoriteBook[]> {
  await storageReady();
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
  await storageReady();
  return enqueueWrite(async () => {
    cachedFavorites = cachedFavorites.filter((fav) => fav.id !== favoriteId);

    try {
      await set(KEY_FAVORITES, cachedFavorites, bookStore);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
      }
    } catch (err) {
      console.warn('IndexedDB remove favorite failed:', err);
    }
  });
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
  await storageReady();
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
  await storageReady();

  return enqueueWrite(async () => {
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
  });
}

export async function removeHistoryBookFromDb(bookId: string): Promise<ColoringBook[]> {
  await storageReady();
  return enqueueWrite(async () => {
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
  });
}

export async function clearHistoryInDb(): Promise<void> {
  await storageReady();
  return enqueueWrite(async () => {
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
  });
}

/* ================= PARENTAL CONSENT OPERATIONS (INDEXEDDB) ================= */

export function getParentalConsentSync(): boolean {
  return cachedConsent?.granted === true;
}

export function getParentalConsentRecordSync(): ParentalConsentRecord | null {
  return cachedConsent;
}

export async function getParentalConsentAsync(): Promise<boolean> {
  await storageReady();
  try {
    let record: ParentalConsentRecord | undefined;
    try {
      record = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, consentStore);
    } catch {
      try {
        record = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, bookStore);
      } catch {}
    }
    if (record && record.granted) {
      cachedConsent = record;
      return true;
    }
  } catch (e) {
    console.warn('Async get consent failed:', e);
  }
  return cachedConsent?.granted === true;
}

export async function getParentalConsentRecordAsync(): Promise<ParentalConsentRecord | null> {
  await storageReady();
  try {
    let record: ParentalConsentRecord | undefined;
    try {
      record = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, consentStore);
    } catch {
      try {
        record = await get<ParentalConsentRecord>(KEY_PARENTAL_CONSENT, bookStore);
      } catch {}
    }
    if (record && record.granted) {
      cachedConsent = record;
      return record;
    }
  } catch (e) {
    console.warn('Async get consent record failed:', e);
  }
  return cachedConsent;
}

export async function saveParentalConsentAsync(details?: {
  childName?: string;
  guardianType?: 'parent' | 'guardian' | 'educator';
  consentToken?: string;
}): Promise<ParentalConsentRecord> {
  await storageReady();
  const record: ParentalConsentRecord = {
    granted: true,
    timestamp: Date.now(),
    childName: details?.childName,
    guardianType: details?.guardianType || 'parent',
    version: '1.0',
    consentToken: details?.consentToken,
  };

  cachedConsent = record;

  try {
    await set(KEY_PARENTAL_CONSENT, record, consentStore);
  } catch (err) {
    console.warn('Failed to save parental consent in consentStore, saving to bookStore fallback:', err);
    try {
      await set(KEY_PARENTAL_CONSENT, record, bookStore);
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('parental_consent_updated', { detail: record }));
  }

  return record;
}

export async function revokeParentalConsentAsync(): Promise<void> {
  await storageReady();
  return enqueueWrite(async () => {
    cachedConsent = null;
    try {
      await del(KEY_PARENTAL_CONSENT, consentStore);
    } catch (err) {
      console.warn('Failed to revoke parental consent in consentStore:', err);
    }
    try {
      await del(KEY_PARENTAL_CONSENT, bookStore);
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('parental_consent_updated', { detail: null }));
    }
  });
}

/**
 * Complete COPPA Data Purge / Right to Erasure
 * Wipes all stored books, illustrations, favorites, session history, and parental consent
 * from IndexedDB, localStorage, and in-memory caches.
 */
export async function purgeAllChildData(): Promise<void> {
  await storageReady();
  return enqueueWrite(async () => {
    cachedAutosave = null;
    cachedFavorites = [];
    cachedHistory = [];
    cachedConsent = null;

    try {
      await clear(bookStore);
      await clear(consentStore);
    } catch (err) {
      console.warn('Error clearing IndexedDB stores:', err);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('coloring_book_autosaved_session_v1');
        localStorage.removeItem('coloring_book_favorites_v1');
        localStorage.removeItem('colorcraft_parental_consent_v1');
      } catch (e) {}
    }

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('coloring_book_session_history_v1');
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coloring_book_autosave_cleared'));
      window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
      window.dispatchEvent(new CustomEvent('coloring_book_session_history_updated', { detail: [] }));
      window.dispatchEvent(new CustomEvent('parental_consent_updated', { detail: null }));
    }
  });
}
