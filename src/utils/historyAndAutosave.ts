import { ColoringBook } from '../types';

const AUTOSAVE_STORAGE_KEY = 'coloring_book_autosaved_session_v1';
const SESSION_HISTORY_KEY = 'coloring_book_session_history_v1';
const MAX_HISTORY_ITEMS = 5;

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
 * Automatically save current book state to browser localStorage.
 */
export function saveBookToLocalStorage(book: ColoringBook): boolean {
  if (!book || !book.id) return false;
  try {
    const data: AutosavedSession = {
      book,
      savedAt: Date.now(),
    };
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('coloring_book_autosave_updated', { detail: data }));
    return true;
  } catch (err) {
    console.warn('Unable to autosave book state to localStorage:', err);
    // If quota exceeded, try saving with lightweight versions of images if necessary
    try {
      const sanitizedPages = book.pages.map((p) => ({
        ...p,
        // Keep imageUrl unless it's an unusually massive string
        imageUrl: p.imageUrl && p.imageUrl.length > 300000 ? p.imageUrl.slice(0, 1000) : p.imageUrl,
      }));
      const fallbackData: AutosavedSession = {
        book: { ...book, pages: sanitizedPages },
        savedAt: Date.now(),
      };
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(fallbackData));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get autosaved session from browser localStorage.
 */
export function getAutosavedSession(): AutosavedSession | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.book && Array.isArray(parsed.book.pages) && parsed.book.pages.length > 0) {
      return {
        book: parsed.book,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to parse autosaved session from localStorage:', err);
    return null;
  }
}

/**
 * Remove autosaved session from browser localStorage.
 */
export function clearAutosavedSession(): void {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('coloring_book_autosave_cleared'));
  } catch (err) {
    console.error('Failed to clear autosaved session:', err);
  }
}

/**
 * Retrieve the current session's generated books list (up to 5) from sessionStorage.
 */
export function getSessionHistory(): ColoringBook[] {
  try {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
    return [];
  } catch (err) {
    console.warn('Failed to parse session history from sessionStorage:', err);
    return [];
  }
}

/**
 * Add or update a book in the session history (up to 5 maximum, newest first).
 */
export function addBookToSessionHistory(book: ColoringBook): ColoringBook[] {
  if (!book || !book.id) return getSessionHistory();

  const current = getSessionHistory();
  // Filter out any existing item with the same id, or identical title & theme & childName
  const filtered = current.filter(
    (item) => item.id !== book.id && !(item.theme === book.theme && item.childName === book.childName && item.title === book.title)
  );

  // Put new/updated book at the beginning and limit to MAX_HISTORY_ITEMS
  const updated = [book, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  try {
    sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('coloring_book_session_history_updated', { detail: updated }));
  } catch (err) {
    console.warn('Failed to save session history to sessionStorage:', err);
  }

  return updated;
}

/**
 * Remove a specific book from session history.
 */
export function removeBookFromSessionHistory(bookId: string): ColoringBook[] {
  const current = getSessionHistory();
  const updated = current.filter((item) => item.id !== bookId);
  try {
    sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('coloring_book_session_history_updated', { detail: updated }));
  } catch (err) {
    console.warn('Failed to update session history in sessionStorage:', err);
  }
  return updated;
}

/**
 * Clear all session history items.
 */
export function clearSessionHistory(): void {
  try {
    sessionStorage.removeItem(SESSION_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('coloring_book_session_history_updated', { detail: [] }));
  } catch (err) {
    console.warn('Failed to clear session history:', err);
  }
}
