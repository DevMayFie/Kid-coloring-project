import { ColoringBook, FavoriteBook } from '../types';

const STORAGE_KEY = 'coloring_book_favorites_v1';

export function getFavorites(): FavoriteBook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse favorites from localStorage:', err);
    return [];
  }
}

export function saveFavorite(book: ColoringBook): FavoriteBook {
  const current = getFavorites();
  const existingIdx = current.findIndex(
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
    pageCount: book.pages.length,
    coverImageUrl: book.coverImageUrl,
    pages: book.pages,
    stickerSheet: book.stickerSheet,
  };

  let updated: FavoriteBook[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = favoriteItem;
  } else {
    updated = [favoriteItem, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
  } catch (err) {
    console.warn('Storage quota exceeded or error saving favorite:', err);
  }

  return favoriteItem;
}

export function removeFavorite(favoriteId: string): void {
  const current = getFavorites();
  const updated = current.filter((fav) => fav.id !== favoriteId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('coloring_book_favorites_updated'));
  } catch (err) {
    console.error('Error removing favorite:', err);
  }
}

export function isFavorite(bookId?: string, theme?: string, childName?: string): boolean {
  if (!bookId && !theme) return false;
  const current = getFavorites();
  return current.some(
    (fav) => fav.id === bookId || (theme && childName && fav.theme.toLowerCase() === theme.toLowerCase() && fav.childName.toLowerCase() === childName.toLowerCase())
  );
}
