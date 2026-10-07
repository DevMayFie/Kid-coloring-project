import { ColoringBook, FavoriteBook } from '../types';
import {
  saveFavoriteToDb,
  getFavoritesSync,
  getFavoritesAsync,
  removeFavoriteFromDb,
  isFavoriteSync,
} from './dbStorage';

/**
 * Get all saved favorite books from persistent IndexedDB.
 */
export function getFavorites(): FavoriteBook[] {
  return getFavoritesSync();
}

/**
 * Async getter for favorites from IndexedDB
 */
export async function getFavoritesPromise(): Promise<FavoriteBook[]> {
  return getFavoritesAsync();
}

/**
 * Save a coloring book to favorites in persistent IndexedDB.
 * Preserves high-resolution base64 drawings, stickers, and metadata without quota limits.
 */
export function saveFavorite(book: ColoringBook): FavoriteBook {
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

  // Write directly to persistent IndexedDB
  saveFavoriteToDb(favoriteItem).catch((err) => {
    console.warn('Persistent IndexedDB save favorite error:', err);
  });

  return favoriteItem;
}

/**
 * Remove a favorite by ID from persistent IndexedDB.
 */
export function removeFavorite(favoriteId: string): void {
  removeFavoriteFromDb(favoriteId).catch((err) => {
    console.warn('Persistent IndexedDB remove favorite error:', err);
  });
}

/**
 * Synchronous check if a book is saved as a favorite.
 */
export function isFavorite(bookId?: string, theme?: string, childName?: string): boolean {
  return isFavoriteSync(bookId, theme, childName);
}
