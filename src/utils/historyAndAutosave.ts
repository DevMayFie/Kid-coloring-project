import { ColoringBook } from '../types';
import {
  saveAutosaveToDb,
  getAutosavedSessionSync,
  clearAutosaveInDb,
  getHistorySync,
  addHistoryBookToDb,
  removeHistoryBookFromDb,
  clearHistoryInDb,
  storageReady,
  isStorageHydrated,
} from './dbStorage';

export { storageReady, isStorageHydrated };

export interface AutosavedSession {
  book: ColoringBook;
  savedAt: number;
}

/**
 * Format relative timestamp nicely (e.g., "Just now", "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Recently';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Automatically save current book state to persistent IndexedDB.
 * Eliminates localStorage 5MB quota errors and prevents data truncation on large base64 image strings.
 */
export function saveBookToLocalStorage(book: ColoringBook): boolean {
  if (!book || !book.id) return false;
  const now = Date.now();
  const data: AutosavedSession = {
    book,
    savedAt: now,
  };

  // Write directly to persistent IndexedDB
  saveAutosaveToDb(book, now).catch((err) => {
    console.warn('Background IndexedDB autosave failed:', err);
  });

  // Dispatch updated event for live UI listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('coloring_book_autosave_updated', { detail: data }));
  }

  return true;
}

/**
 * Alias for saveBookToLocalStorage that accurately reflects persistent IndexedDB storage
 */
export const saveBookToIndexedDb = saveBookToLocalStorage;

/**
 * Get autosaved session from persistent IndexedDB.
 */
export function getAutosavedSession(): AutosavedSession | null {
  const dbSession = getAutosavedSessionSync();
  if (dbSession && dbSession.book && Array.isArray(dbSession.book.pages) && dbSession.book.pages.length > 0) {
    return dbSession;
  }
  return null;
}

/**
 * Remove autosaved session from persistent IndexedDB.
 */
export function clearAutosavedSession(): void {
  clearAutosaveInDb().catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('coloring_book_autosave_cleared'));
  }
}

/**
 * Retrieve the current generated books history from persistent IndexedDB.
 */
export function getSessionHistory(): ColoringBook[] {
  return getHistorySync();
}

/**
 * Add or update a book in the persistent IndexedDB history (newest first).
 */
export function addBookToSessionHistory(book: ColoringBook): ColoringBook[] {
  if (!book || !book.id) return getHistorySync();

  // Asynchronously writes to IndexedDB while maintaining immediate synchronous cache
  addHistoryBookToDb(book).catch((err) => {
    console.warn('Persistent IndexedDB session history write error:', err);
  });

  return getHistorySync();
}

/**
 * Remove a specific book from persistent IndexedDB history.
 */
export function removeBookFromSessionHistory(bookId: string): ColoringBook[] {
  removeHistoryBookFromDb(bookId).catch((err) => {
    console.warn('Persistent IndexedDB session history remove error:', err);
  });
  return getHistorySync();
}

/**
 * Clear all persistent IndexedDB history items.
 */
export function clearSessionHistory(): void {
  clearHistoryInDb().catch(() => {});
}
