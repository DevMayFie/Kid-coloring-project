import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, auth, ensureFirebaseAuth, handleFirestoreError, OperationType } from './firebase';
import { ColoringBook, ColoringPage } from '../types';

export interface PublishedCommunityBook {
  id: string;
  title: string;
  theme: string;
  subtitle: string;
  authorName: string;
  authorUid: string;
  difficulty: 'toddler' | 'standard' | 'intricate';
  artStyle?: string;
  pageCount: number;
  coverSvg: string;
  pages: ColoringPage[];
  likesCount: number;
  downloadsCount: number;
  createdAt: number;
}

const COLLECTION_NAME = 'community_books';

/**
 * Sanitize and strip child photos/names for child safety compliance
 */
export function sanitizeForPublishing(
  book: ColoringBook,
  authorDisplayName: string
): {
  id: string;
  title: string;
  theme: string;
  subtitle: string;
  authorName: string;
  difficulty: 'toddler' | 'standard' | 'intricate';
  artStyle: string;
  pageCount: number;
  coverSvg: string;
  pagesJson: string;
} {
  const safeId = `cb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanTitle = (book.title || 'Coloring Adventure')
    .replace(new RegExp(book.childName, 'gi'), 'Explorer')
    .slice(0, 120);

  const cleanSubtitle = (book.subtitle || 'A Creative Coloring Mission')
    .replace(new RegExp(book.childName, 'gi'), 'Little Artist')
    .slice(0, 200);

  // Filter and sanitize pages: strip hero photos/PII
  const cleanPages: ColoringPage[] = book.pages.map((p, idx) => ({
    id: `page-${idx + 1}`,
    pageNumber: idx + 1,
    title: p.title || `Page ${idx + 1}`,
    storyCaption: (p.storyCaption || '').replace(new RegExp(book.childName, 'gi'), 'our adventurer'),
    secondaryCaption: p.secondaryCaption,
    secondaryLanguage: p.secondaryLanguage,
    funFactOrTip: p.funFactOrTip,
    artStyle: p.artStyle || book.artStyle || 'classic',
    prompt: p.prompt || '',
    imageUrl: p.imageUrl || '',
    status: 'completed',
    resolution: p.resolution || '2K',
    activityMode: p.activityMode || 'standard',
    numberLegend: p.numberLegend,
    borderStyle: p.borderStyle || 'none',
    placedStickers: p.placedStickers,
    dotToDotPoints: p.dotToDotPoints,
    isDrawYourEndingPage: p.isDrawYourEndingPage,
    // explicitly omit heroPhotoUrl and isHeroPage to protect child privacy
  }));

  const cleanAuthor = (authorDisplayName || 'Anonymous Artist').trim().slice(0, 60) || 'Anonymous Artist';

  return {
    id: safeId,
    title: cleanTitle,
    theme: (book.theme || 'Creative Coloring').slice(0, 100),
    subtitle: cleanSubtitle,
    authorName: cleanAuthor,
    difficulty: (book.difficulty as any) || 'standard',
    artStyle: book.artStyle || 'classic',
    pageCount: cleanPages.length,
    coverSvg: book.coverImageUrl || '',
    pagesJson: JSON.stringify(cleanPages),
  };
}

/**
 * Publish a coloring book to the Firebase Community Gallery
 */
export async function publishBookToCommunity(
  book: ColoringBook,
  authorName: string
): Promise<string> {
  const user = await ensureFirebaseAuth();
  const safePayload = sanitizeForPublishing(book, authorName);

  const docRef = doc(db, COLLECTION_NAME, safePayload.id);

  try {
    await setDoc(docRef, {
      id: safePayload.id,
      title: safePayload.title,
      theme: safePayload.theme,
      subtitle: safePayload.subtitle,
      authorName: safePayload.authorName,
      authorUid: user.uid,
      difficulty: safePayload.difficulty,
      artStyle: safePayload.artStyle,
      pageCount: safePayload.pageCount,
      coverSvg: safePayload.coverSvg,
      pages: safePayload.pagesJson,
      likesCount: 0,
      downloadsCount: 0,
      createdAt: serverTimestamp(),
    });

    return safePayload.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${safePayload.id}`);
  }
}

/**
 * Fetch top and recent books from the Community Gallery
 */
export async function fetchCommunityBooks(maxResults = 24): Promise<PublishedCommunityBook[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), limit(maxResults));
    const snapshot = await getDocs(q);

    const books: PublishedCommunityBook[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let parsedPages: ColoringPage[] = [];
      try {
        parsedPages = JSON.parse(data.pages || '[]');
      } catch {
        parsedPages = [];
      }

      books.push({
        id: docSnap.id,
        title: data.title || 'Community Coloring Book',
        theme: data.theme || 'Fun Art',
        subtitle: data.subtitle || '',
        authorName: data.authorName || 'Anonymous Artist',
        authorUid: data.authorUid || '',
        difficulty: data.difficulty || 'standard',
        artStyle: data.artStyle,
        pageCount: data.pageCount || parsedPages.length || 5,
        coverSvg: data.coverSvg || '',
        pages: parsedPages,
        likesCount: data.likesCount || 0,
        downloadsCount: data.downloadsCount || 0,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
      });
    });

    return books.sort((a, b) => b.likesCount - a.likesCount);
  } catch (error) {
    console.warn('Could not load community books from Firestore:', error);
    return [];
  }
}

/**
 * Like a community book (increments likesCount)
 */
export async function likeCommunityBook(bookId: string): Promise<void> {
  await ensureFirebaseAuth();
  const docRef = doc(db, COLLECTION_NAME, bookId);
  try {
    await updateDoc(docRef, {
      likesCount: increment(1),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${bookId}`);
  }
}

/**
 * Increment open/downloads counter when a user loads a community book
 */
export async function recordCommunityBookDownload(bookId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, COLLECTION_NAME, bookId);
    await updateDoc(docRef, {
      downloadsCount: increment(1),
    });
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Convert a published community book into a full active ColoringBook state
 */
export function convertCommunityBookToColoringBook(
  item: PublishedCommunityBook,
  recipientName = 'Artist'
): ColoringBook {
  return {
    id: `imported-${item.id}-${Date.now()}`,
    title: item.title,
    theme: item.theme,
    childName: recipientName,
    subtitle: item.subtitle,
    dedication: `Created by ${item.authorName} • Enjoy coloring with your best colors!`,
    difficulty: item.difficulty,
    artStyle: (item.artStyle as any) || 'classic',
    resolution: '2K',
    aspectRatio: '3:4',
    coverImageUrl: item.coverSvg,
    coverStatus: 'completed',
    pages: item.pages,
    createdAt: Date.now(),
  };
}
