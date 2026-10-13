import { ColoringBook } from '../types';

export interface ExportedBookPackage {
  app: string;
  version: string;
  exportedAt: number;
  book: ColoringBook;
}

/**
 * Exports a coloring book as a downloadable .colorkid JSON file
 */
export function exportBookToJsonFile(book: ColoringBook): void {
  const pkg: ExportedBookPackage = {
    app: 'ColorCraft Studio',
    version: '1.0.0',
    exportedAt: Date.now(),
    book,
  };

  const jsonString = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeFilename = `${(book.title || 'coloring-book')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')}.colorkid`;
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses an imported file or JSON string into a ColoringBook
 */
export function parseImportedBookJson(rawText: string): ColoringBook {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON file format. Please upload a valid .colorkid or JSON book file.');
  }

  // Handle either wrapped package { app, book } or direct ColoringBook object
  const candidateBook: ColoringBook = parsed.book ? parsed.book : parsed;

  if (!candidateBook || !Array.isArray(candidateBook.pages) || candidateBook.pages.length === 0) {
    throw new Error('This file does not contain valid coloring book pages.');
  }

  if (!candidateBook.title && !candidateBook.theme) {
    throw new Error('The file is missing title or theme information.');
  }

  // Ensure unique ID and timestamps on import
  return {
    ...candidateBook,
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    pages: candidateBook.pages.map((p, idx) => ({
      ...p,
      id: p.id || `p-${idx + 1}`,
      pageNumber: idx + 1,
      status: p.status || 'completed',
    })),
  };
}
