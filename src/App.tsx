import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BookForm } from './components/BookForm';
import { ColoringBookView } from './components/ColoringBookView';
import { HistorySection } from './components/HistorySection';
import { RestoreSessionBanner } from './components/RestoreSessionBanner';
import { ChatDrawer } from './components/ChatDrawer';
import { PdfExportModal } from './components/PdfExportModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { PageEditorModal } from './components/PageEditorModal';
import { PageReorderModal } from './components/PageReorderModal';
import { Tooltip } from './components/Tooltip';
import { ProgressRing } from './components/ProgressRing';
import { BatchRegenerateModal } from './components/BatchRegenerateModal';
import { BrandIntegrationModal } from './components/BrandIntegrationModal';
import { WebsiteIntegrationsModal } from './components/WebsiteIntegrationsModal';
import { BonusActivitiesModal } from './components/BonusActivitiesModal';
import {
  ColoringBook,
  ColoringPage,
  ImageResolution,
  AspectRatio,
  ColoringDifficulty,
  FavoriteBook,
  ActivityMode,
  BookLanguage,
  NumberLegendItem,
  PageBorderStyle,
  PlacedSticker,
  BrandIntegration,
} from './types';
import { DEFAULT_COLORING_BOOK, createSampleLineArtSvg, createSampleStickersSvg } from './utils/sampleData';
import { createThematicCoverSvg, buildThematicCoverAiPrompt } from './utils/coverIllustrationGenerator';
import { generateColoringBookPdf } from './utils/pdfGenerator';
import { playChimeSound } from './utils/kidAudio';
import { escapeHtml } from './utils/security';
import {
  saveBookToLocalStorage,
  getAutosavedSession,
  getSessionHistory,
  addBookToSessionHistory,
  removeBookFromSessionHistory,
  clearSessionHistory,
  AutosavedSession,
} from './utils/historyAndAutosave';
import { Sparkles, Printer, Download, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [book, setBook] = useState<ColoringBook>(DEFAULT_COLORING_BOOK);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [generationStep, setGenerationStep] = useState(0);

  // History & Autosave state
  const [historyBooks, setHistoryBooks] = useState<ColoringBook[]>(() => {
    const existing = getSessionHistory();
    if (existing.length === 0) {
      return addBookToSessionHistory(DEFAULT_COLORING_BOOK);
    }
    return existing;
  });
  const [autosavedSession, setAutosavedSession] = useState<AutosavedSession | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // Modals & Drawers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isPageReorderOpen, setIsPageReorderOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    pageTitle: string;
    percent: number;
  } | null>(null);
  const [editingPage, setEditingPage] = useState<ColoringPage | null>(null);
  const [isRegeneratingSingle, setIsRegeneratingSingle] = useState(false);
  const [isPreparingBottomPdf, setIsPreparingBottomPdf] = useState(false);
  const [pdfPrepProgress, setPdfPrepProgress] = useState(0);
  const [isBookGenerationFinished, setIsBookGenerationFinished] = useState(true);
  const [isPdfBtnTooltipVisible, setIsPdfBtnTooltipVisible] = useState(false);

  // On initial page load: check if auto-saved session exists in persistent IndexedDB
  useEffect(() => {
    const checkSaved = () => {
      const saved = getAutosavedSession();
      if (saved && saved.book && Array.isArray(saved.book.pages) && saved.book.pages.length > 0) {
        setAutosavedSession(saved);
        setShowRestoreBanner(true);
      }
      const history = getSessionHistory();
      if (history.length > 0) {
        setHistoryBooks(history);
      }
    };
    checkSaved();

    const handleHistoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setHistoryBooks(e.detail);
      }
    };

    window.addEventListener('coloring_book_storage_ready', checkSaved);
    window.addEventListener('coloring_book_autosave_updated', checkSaved);
    window.addEventListener('coloring_book_session_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('coloring_book_storage_ready', checkSaved);
      window.removeEventListener('coloring_book_autosave_updated', checkSaved);
      window.removeEventListener('coloring_book_session_history_updated', handleHistoryUpdate);
    };
  }, []);

  // Automatically save current book state to persistent IndexedDB whenever a change is made
  useEffect(() => {
    if (book && book.id) {
      saveBookToLocalStorage(book);
      // Keep autosaved session in sync
      setAutosavedSession({
        book,
        savedAt: Date.now(),
      });
    }
  }, [book]);

  // Global shortcut: Listen for Ctrl+S or Cmd+S to trigger the export PDF button click handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // Prevent browser's native Save Webpage dialog
        const exportBtn = document.getElementById('bottom-download-pdf-btn');
        if (exportBtn) {
          exportBtn.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Generate coloring book with Gemini
  const handleGenerateBook = async (options: {
    theme: string;
    childName: string;
    customTitle?: string;
    dedicationAuthor?: string;
    pageCount?: number;
    difficulty?: ColoringDifficulty;
    activityMode?: ActivityMode;
    secondaryLanguage?: BookLanguage;
    resolution: ImageResolution;
    aspectRatio: AspectRatio;
    userNotes?: string;
  }) => {
    const targetPageCount = Math.max(1, Math.min(12, options.pageCount || 5));
    const targetDifficulty: ColoringDifficulty = options.difficulty || 'standard';
    const targetActivityMode: ActivityMode = options.activityMode || 'standard';
    const targetSecondaryLang: BookLanguage | undefined = options.secondaryLanguage;
    const explicitTitle = options.customTitle?.trim() || '';
    const cleanAuthor = options.dedicationAuthor?.trim() || '';
    setIsBookGenerationFinished(false);
    setIsGeneratingBook(true);
    setGenerationStep(1);
    const difficultyLabel =
      targetDifficulty === 'toddler' ? 'toddler lines' : targetDifficulty === 'intricate' ? 'intricate patterns' : 'standard outlines';
    const modeLabel =
      targetActivityMode === 'color-by-numbers' ? 'Color by Numbers' : targetActivityMode === 'dot-to-dot' ? 'Dot-to-Dot Puzzle' : 'Storybook';
    setGenerationProgressText(`Planning ${targetPageCount} ${modeLabel} scenes (${difficultyLabel}) for ${options.childName}...`);

    try {
      // Step 1: Call /api/plan-book to generate cohesive story adventure with coloring tips
      let planData: any = null;
      try {
        const planRes = await fetch('/api/plan-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: options.theme,
            childName: options.childName,
            customTitle: explicitTitle || undefined,
            dedicationAuthor: cleanAuthor || undefined,
            pageCount: targetPageCount,
            difficulty: targetDifficulty,
            activityMode: targetActivityMode,
            secondaryLanguage: targetSecondaryLang || undefined,
            userNotes: options.userNotes,
          }),
        });

        const planJson = await planRes.json();
        if (planJson.success && planJson.plan) {
          planData = planJson.plan;
        }
      } catch (planErr) {
        console.warn('API plan call failed, falling back to local story outline:', planErr);
      }

      const defaultLegend: NumberLegendItem[] = [
        { number: 1, colorName: 'Sky Blue', hex: '#38bdf8' },
        { number: 2, colorName: 'Sun Yellow', hex: '#facc15' },
        { number: 3, colorName: 'Grass Green', hex: '#4ade80' },
        { number: 4, colorName: 'Ruby Red', hex: '#f87171' },
        { number: 5, colorName: 'Grape Purple', hex: '#c084fc' },
      ];

      // If plan API had an issue, synthesize structured scenes with fun facts and tips
      if (!planData || !planData.pages || planData.pages.length === 0) {
        const promptStylePrefix =
          targetDifficulty === 'toddler'
            ? "Toddler coloring book page, simple thick lines for toddlers, ultra-bold heavy black outlines, giant open shapes for chunky crayons, zero clutter, minimal elements, pure white background"
            : targetDifficulty === 'intricate'
            ? "Intricate coloring book page for older children, intricate patterns for older children, detailed crisp black line art, decorative zentangles, ornate background scenery, complex detailed coloring sections, pure white background"
            : "Children's coloring book page, bold thick crisp black outlines, pure white background, clear recognizable shapes, playful fun details, large open shapes for coloring";

        const isSpanishSecondary = targetSecondaryLang === 'es';
        const defaultScenes = [
          {
            title: `The Journey Begins with ${options.theme}`,
            caption: `${options.childName}'s great adventure begins today with happy smiles!`,
            secCaption: isSpanishSecondary
              ? `¡La gran aventura de ${options.childName} comienza hoy con sonrisas felices!`
              : undefined,
            tip: `Coloring Tip: Give the character a bright sunshine yellow smile!`,
            prompt: `${promptStylePrefix}, cute friendly ${options.theme} waving hello`,
          },
          {
            title: `Exploring the ${options.theme} World`,
            caption: `Look at all the magical discoveries waiting to be explored!`,
            secCaption: isSpanishSecondary
              ? `¡Mira todos los descubrimientos mágicos esperando ser explorados!`
              : undefined,
            tip: `Fun Fact: Exploring new places helps your imagination grow as tall as a giant!`,
            prompt: `${promptStylePrefix}, ${options.theme} exploring with cute gadgets`,
          },
          {
            title: `A Playful ${options.theme} Friend`,
            caption: `Sharing snacks and playing games with good friends!`,
            secCaption: isSpanishSecondary
              ? `¡Compartiendo meriendas y jugando juegos con buenos amigos!`
              : undefined,
            tip: `Coloring Tip: Try coloring the background with cool sky blues and grass greens!`,
            prompt: `${promptStylePrefix}, ${options.theme} having a picnic or playing games with friends`,
          },
          {
            title: `The Big Exciting Discovery`,
            caption: `Look up high! A wonderful surprise shines bright in the sky!`,
            secCaption: isSpanishSecondary
              ? `¡Mira hacia arriba! ¡Una maravillosa sorpresa brilla en el cielo!`
              : undefined,
            tip: `Fun Fact: Stars in outer space can twinkle in shades of red, white, and blue!`,
            prompt: `${promptStylePrefix}, ${options.theme} discovering a glowing treasure or starry prize`,
          },
          {
            title: `Celebration & Sweet Dreams`,
            caption: `A happy celebration for ${options.childName}'s brave adventure!`,
            secCaption: isSpanishSecondary
              ? `¡Una alegre celebración para la valiente aventura de ${options.childName}!`
              : undefined,
            tip: `Coloring Tip: Use every color in your crayon box to make the confetti burst!`,
            prompt: `${promptStylePrefix}, ${options.theme} celebrating with confetti, balloons, and smiling stars`,
          },
        ];

        const fallbackPages = [];
        for (let pIdx = 0; pIdx < targetPageCount; pIdx++) {
          const scene = defaultScenes[pIdx % defaultScenes.length];
          fallbackPages.push({
            pageNumber: pIdx + 1,
            sceneTitle: scene.title,
            storyCaption: scene.caption,
            secondaryCaption: scene.secCaption,
            funFactOrTip: scene.tip,
            imagePrompt: scene.prompt,
            numberLegend: targetActivityMode === 'color-by-numbers' ? defaultLegend : undefined,
          });
        }

        const coverPrompt = buildThematicCoverAiPrompt(
          options.theme,
          options.childName,
          targetDifficulty
        );

        planData = {
          bookTitle: explicitTitle || `${options.childName}'s ${options.theme} Adventure`,
          subtitle: `A ${targetPageCount}-Page Coloring Journey filled with Fun!`,
          dedication: cleanAuthor
            ? `Created with love especially for ${options.childName} from ${cleanAuthor} • Happy Coloring!`
            : `Created with love especially for ${options.childName} • Happy Coloring!`,
          coverPrompt,
          pages: fallbackPages,
        };
      } else if (explicitTitle) {
        planData.bookTitle = explicitTitle;
      }

      // Initialize the new book object with pending status for all requested pages
      const newPages: ColoringPage[] = planData.pages.slice(0, targetPageCount).map((p: any, idx: number) => ({
        id: `page-${Date.now()}-${idx + 1}`,
        pageNumber: idx + 1,
        title: p.sceneTitle || `Scene ${idx + 1}`,
        storyCaption: p.storyCaption || `Coloring scene ${idx + 1}`,
        secondaryCaption: p.secondaryCaption || (targetSecondaryLang ? `Coloring scene ${idx + 1}` : undefined),
        secondaryLanguage: targetSecondaryLang,
        funFactOrTip: p.funFactOrTip || `Coloring tip: Try using your favorite bright colors here!`,
        prompt: p.imagePrompt || `Children's coloring book page of ${options.theme}`,
        status: 'generating',
        resolution: options.resolution,
        activityMode: targetActivityMode,
        numberLegend: p.numberLegend || (targetActivityMode === 'color-by-numbers' ? defaultLegend : undefined),
      }));

      const newBook: ColoringBook = {
        id: `book-${Date.now()}`,
        theme: options.theme,
        childName: options.childName,
        difficulty: targetDifficulty,
        activityMode: targetActivityMode,
        language: 'en',
        secondaryLanguage: targetSecondaryLang,
        dedicationAuthor: cleanAuthor || undefined,
        title: explicitTitle || planData.bookTitle || `${options.childName}'s ${options.theme} Coloring Book`,
        subtitle: planData.subtitle || `A ${targetPageCount}-Page Adventure to Color`,
        dedication: planData.dedication || `Created especially for ${options.childName}`,
        resolution: options.resolution,
        aspectRatio: options.aspectRatio,
        coverStatus: 'generating',
        coverPrompt: planData.coverPrompt,
        pages: newPages,
        createdAt: Date.now(),
        stickerSheet: {
          id: `stickers-${Date.now()}`,
          title: `${options.childName}'s ${options.theme} Printable Stickers`,
          imageUrl: createSampleStickersSvg(options.theme, options.childName),
          status: 'completed',
          prompt: `Printable cut-out sticker sheet with 6 cute themed badges and cut lines for ${options.theme}`,
        },
      };

      setBook(newBook);

      // Step 2: Generate Thematic Cover Art
      setGenerationStep(2);
      setGenerationProgressText(`Drawing custom thematic cover for ${options.childName} in ${options.resolution} (${difficultyLabel}) using Gemini 3 Pro...`);

      let coverUrl = '';
      try {
        const coverRes = await fetch('/api/generate-cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: options.theme,
            childName: options.childName,
            prompt: planData.coverPrompt,
            imageSize: options.resolution,
            aspectRatio: options.aspectRatio,
            difficulty: targetDifficulty,
          }),
        });
        const coverData = await coverRes.json();
        if (coverData.success && coverData.imageUrl) {
          coverUrl = coverData.imageUrl;
        }
      } catch (err) {
        console.warn('Cover image API failed, using thematic vector SVG fallback:', err);
      }

      if (!coverUrl) {
        coverUrl = createThematicCoverSvg(options.theme, options.childName, targetDifficulty);
      }

      setBook((prev) => ({
        ...prev,
        coverImageUrl: coverUrl,
        coverStatus: 'completed',
      }));

      // Step 3: Sequentially generate each of the coloring pages
      for (let i = 0; i < newPages.length; i++) {
        const pageNum = i + 1;
        setGenerationStep(2 + pageNum);
        setGenerationProgressText(
          `Generating Page ${pageNum} of ${newPages.length}: "${newPages[i].title}" in ${options.resolution} (${difficultyLabel})...`
        );

        let pageImgUrl = '';
        let pageErrorMsg = '';
        try {
          const imgRes = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: newPages[i].prompt,
              imageSize: options.resolution,
              aspectRatio: options.aspectRatio,
              difficulty: targetDifficulty,
            }),
          });
          const imgData = await imgRes.json();
          if (imgData.success && imgData.imageUrl) {
            pageImgUrl = imgData.imageUrl;
          } else {
            pageErrorMsg = imgData.error || 'Drawing could not be generated';
          }
        } catch (pageGenErr: any) {
          console.warn(`Page ${pageNum} generation failed:`, pageGenErr);
          pageErrorMsg = 'Network error while generating page art';
        }

        // Update this page in book state honestly: completed if imageUrl, error if failed
        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === i
              ? pageImgUrl
                ? { ...p, imageUrl: pageImgUrl, status: 'completed', errorMessage: undefined }
                : {
                    ...p,
                    imageUrl: undefined,
                    status: 'error',
                    errorMessage: pageErrorMsg || 'Image generation failed. Click Retry to redraw this page.',
                  }
              : p
          ),
        }));
      }

      // Success celebration!
      setIsBookGenerationFinished(true);
      setBook((currentBook) => {
        setHistoryBooks(addBookToSessionHistory(currentBook));
        return currentBook;
      });
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {}

    } catch (err: any) {
      console.error('Error in handleGenerateBook:', err);
      alert('An issue occurred during generation: ' + (err.message || 'Please try again.'));
    } finally {
      setIsGeneratingBook(false);
      setGenerationProgressText('');
      setGenerationStep(0);
    }
  };

  // Regenerate a single page
  const handleRegeneratePage = async (pageId: string, customPrompt?: string, resolution?: ImageResolution) => {
    const pageToRegen = book.pages.find((p) => p.id === pageId);
    if (!pageToRegen) return;

    setBook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId ? { ...p, status: 'generating' } : p
      ),
    }));

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt || pageToRegen.prompt,
          imageSize: resolution || pageToRegen.resolution || book.resolution,
          aspectRatio: book.aspectRatio,
          difficulty: book.difficulty || 'standard',
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, imageUrl: data.imageUrl, status: 'completed', errorMessage: undefined, resolution: resolution || p.resolution }
              : p
          ),
        }));
      } else {
        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, status: 'error', errorMessage: data?.error || 'Could not redraw page. Click Retry.' }
              : p
          ),
        }));
      }
    } catch (err) {
      console.error('Failed to regenerate page:', err);
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId ? { ...p, status: 'error', errorMessage: 'Could not redraw page' } : p
        ),
      }));
    }
  };

  // Regenerate Cover
  const handleRegenerateCover = async (forceVectorStyle = false) => {
    setBook((prev) => ({ ...prev, coverStatus: 'generating' }));
    try {
      if (forceVectorStyle) {
        const newCoverUrl = createThematicCoverSvg(
          book.theme,
          book.childName,
          book.difficulty || 'standard'
        );
        setBook((prev) => ({
          ...prev,
          coverImageUrl: newCoverUrl,
          coverStatus: 'completed',
        }));
        return;
      }

      const res = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: book.theme,
          childName: book.childName,
          prompt: book.coverPrompt || buildThematicCoverAiPrompt(book.theme, book.childName, book.difficulty || 'standard'),
          imageSize: book.resolution,
          aspectRatio: book.aspectRatio,
          difficulty: book.difficulty || 'standard',
        }),
      });
      const data = await res.json();
      let newCoverUrl = '';
      if (data.success && data.imageUrl) {
        newCoverUrl = data.imageUrl;
      } else {
        newCoverUrl = createThematicCoverSvg(book.theme, book.childName, book.difficulty || 'standard');
      }

      setBook((prev) => ({
        ...prev,
        coverImageUrl: newCoverUrl,
        coverStatus: 'completed',
      }));
    } catch (e) {
      const fallbackUrl = createThematicCoverSvg(book.theme, book.childName, book.difficulty || 'standard');
      setBook((prev) => ({ ...prev, coverImageUrl: fallbackUrl, coverStatus: 'completed' }));
    }
  };

  // Print single page
  const handlePrintSinglePage = async (page: ColoringPage) => {
    playChimeSound('sparkle');
    const singlePageBook: ColoringBook = {
      ...book,
      pages: [page],
    };

    try {
      const doc = await generateColoringBookPdf(singlePageBook, {
        includeCover: false,
        paperSize: 'letter',
        includeCaptions: true,
      });

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // Try invisible iframe print first to bypass iframe popup blocking
      try {
        let printFrame = document.getElementById('single-page-print-iframe') as HTMLIFrameElement;
        if (printFrame) {
          printFrame.remove();
        }
        printFrame = document.createElement('iframe');
        printFrame.id = 'single-page-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = blobUrl;
        document.body.appendChild(printFrame);
        printFrame.onload = () => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            const printWindow = window.open(blobUrl, '_blank');
            if (printWindow) printWindow.focus();
          }
        };
      } catch (e) {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) printWindow.focus();
      }
    } catch (err) {
      console.error('Error printing single page:', err);
    }
  };

  // Update border for a single page
  const handleUpdatePageBorder = (pageId: string, borderStyle: PageBorderStyle) => {
    setBook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, borderStyle } : p)),
    }));
    playChimeSound('sparkle');
  };

  // Update border for all pages in book
  const handleUpdateAllBorders = (borderStyle: PageBorderStyle) => {
    setBook((prev) => ({
      ...prev,
      defaultBorderStyle: borderStyle,
      pages: prev.pages.map((p) => ({ ...p, borderStyle })),
    }));
    playChimeSound('sparkle');
  };

  // Save colored artwork and placed digital stickers to page
  const handleSavePageArtwork = (
    pageId: string,
    coloredDataUrl: string,
    stickers: PlacedSticker[],
    borderStyle?: PageBorderStyle
  ) => {
    if (pageId === 'cover') {
      setBook((prev) => ({
        ...prev,
        coverImageUrl: coloredDataUrl,
      }));
    } else if (pageId === 'stickers') {
      setBook((prev) => ({
        ...prev,
        stickerSheet: prev.stickerSheet
          ? { ...prev.stickerSheet, imageUrl: coloredDataUrl }
          : undefined,
      }));
    } else {
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                coloredImageUrl: coloredDataUrl,
                placedStickers: stickers,
                borderStyle: borderStyle || p.borderStyle,
              }
            : p
        ),
      }));
    }
    playChimeSound('fanfare');
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  // Save voice recording for a page
  const handleSaveVoiceAudio = (pageId: string, audioUrl: string, duration: number) => {
    setBook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              voiceAudioUrl: audioUrl,
              voiceAudioDuration: duration,
            }
          : p
      ),
    }));
    playChimeSound('pop');
  };

  // Add personalized hero photo-to-line-art page or cover
  const handleAddHeroPage = (heroData: { imageUrl: string; title: string; caption: string; asCover?: boolean }) => {
    if (heroData.asCover) {
      setBook((prev) => ({
        ...prev,
        coverImageUrl: heroData.imageUrl,
        coverStatus: 'completed',
        subtitle: heroData.caption,
      }));
    } else {
      const newPage: ColoringPage = {
        id: `page-hero-${Date.now()}`,
        pageNumber: book.pages.length + 1,
        title: heroData.title,
        storyCaption: heroData.caption,
        prompt: `Custom photo outline coloring page for ${book.childName}`,
        imageUrl: heroData.imageUrl,
        status: 'completed',
        funFactOrTip: `Starring ${book.childName}! Color the outlines with your favorite crayons.`,
        borderStyle: book.defaultBorderStyle || 'classic-double',
      };
      setBook((prev) => ({
        ...prev,
        pages: [...prev.pages, newPage],
      }));
    }
    playChimeSound('fanfare');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Toggle QR code printing
  const handleToggleQrCode = (enabled: boolean) => {
    setBook((prev) => ({
      ...prev,
      includeQrCode: enabled,
    }));
    playChimeSound('pop');
  };

  // Update certificate details
  const handleUpdateCertificate = (details: { recipientName: string; awardDate: string; presenter?: string }) => {
    setBook((prev) => ({
      ...prev,
      certificate: details,
    }));
    playChimeSound('sparkle');
  };

  // Reorder story pages sequence
  const handleReorderPages = (reorderedPages: ColoringPage[]) => {
    const updatedPages = reorderedPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1,
    }));
    setBook((prev) => ({
      ...prev,
      pages: updatedPages,
    }));
    playChimeSound('fanfare');
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  // Batch regenerate all pages in book with single click
  const handleBatchRegenerateAll = async (newTheme?: string, refreshPlan: boolean = true) => {
    const targetTheme = newTheme?.trim() || book.theme;
    setIsBatchGenerating(true);
    const total = book.pages.length;

    try {
      let pagePrompts = book.pages.map((p) => p.prompt);
      let pageTitles = book.pages.map((p) => p.title);

      // If new theme is provided and refreshPlan is true, request new storyboard scene plan
      if (refreshPlan && targetTheme !== book.theme) {
        setBatchProgress({
          current: 0,
          total,
          pageTitle: `Writing new "${targetTheme}" adventure story...`,
          percent: 5,
        });

        try {
          const planRes = await fetch('/api/plan-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              theme: targetTheme,
              childName: book.childName,
              pageCount: total,
              difficulty: book.difficulty || 'standard',
              activityMode: book.activityMode || 'standard',
              language: book.language || 'en',
              secondaryLanguage: book.secondaryLanguage,
            }),
          });
          const planData = await planRes.json();
          const rawPages = planData.plan?.pages || planData.pages;
          if (planData.success && Array.isArray(rawPages)) {
            pagePrompts = rawPages.map((p: any) => p.imagePrompt);
            pageTitles = rawPages.map((p: any) => p.sceneTitle);

            setBook((prev) => ({
              ...prev,
              theme: targetTheme,
              title: planData.plan?.bookTitle || planData.bookTitle || `${prev.childName}'s ${targetTheme} Coloring Book`,
              subtitle: planData.plan?.subtitle || planData.subtitle || prev.subtitle,
              coverPrompt: planData.plan?.coverPrompt || planData.coverPrompt || prev.coverPrompt,
              pages: prev.pages.map((p, idx) => ({
                ...p,
                title: rawPages[idx]?.sceneTitle || p.title,
                storyCaption: rawPages[idx]?.storyCaption || p.storyCaption,
                secondaryCaption: rawPages[idx]?.secondaryCaption || p.secondaryCaption,
                prompt: rawPages[idx]?.imagePrompt || p.prompt,
                status: 'generating',
              })),
            }));
          }
        } catch (planErr) {
          console.warn('Batch plan refresh failed, using existing outline prompts:', planErr);
        }
      }

      // Sequentially regenerate each page
      for (let i = 0; i < total; i++) {
        const page = book.pages[i];
        const title = pageTitles[i] || page.title;
        const prompt = pagePrompts[i] || page.prompt;

        setBatchProgress({
          current: i + 1,
          total,
          pageTitle: `Page ${i + 1}: ${title}`,
          percent: Math.round(((i + 1) / total) * 100),
        });

        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) => (idx === i ? { ...p, status: 'generating' } : p)),
        }));

        let newUrl = '';
        let batchErrorMsg = '';
        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              imageSize: page.resolution || book.resolution,
              aspectRatio: book.aspectRatio,
              difficulty: book.difficulty || 'standard',
            }),
          });
          const data = await res.json();
          if (data.success && data.imageUrl) {
            newUrl = data.imageUrl;
          } else {
            batchErrorMsg = data.error || 'Failed to redraw page';
          }
        } catch (err) {
          console.warn('Batch regen image API error:', err);
          batchErrorMsg = 'Network error during batch generation';
        }

        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === i
              ? newUrl
                ? { ...p, imageUrl: newUrl, status: 'completed', errorMessage: undefined }
                : { ...p, imageUrl: undefined, status: 'error', errorMessage: batchErrorMsg || 'Batch draw failed. Click Retry.' }
              : p
          ),
        }));
      }

      playChimeSound('fanfare');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
      setIsBatchModalOpen(false);
    } catch (err) {
      console.error('Batch regen failed:', err);
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  // Regenerate printable cut-out sticker sheet
  const handleRegenerateStickers = async () => {
    setBook((prev) => ({
      ...prev,
      stickerSheet: prev.stickerSheet
        ? { ...prev.stickerSheet, status: 'generating' }
        : {
            id: `stickers-${Date.now()}`,
            title: `${prev.childName}'s ${prev.theme} Printable Stickers`,
            status: 'generating',
          },
    }));

    let stickerUrl = '';
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Printable cut-out sticker sheet for children's coloring book, theme "${book.theme}", 6 distinct cute vector outline sticker illustrations with dashed border cut lines around each sticker, scissors cut icons, star badges, trophies, theme icons, pure white background, thick black outlines, no color, perfect for cutting out and sticking onto coloring book pages`,
          imageSize: book.resolution,
          aspectRatio: '3:4',
          difficulty: book.difficulty || 'standard',
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        stickerUrl = data.imageUrl;
      }
    } catch (err) {
      console.warn('Sticker generation API error, using clean vector cut-out sticker sheet:', err);
    }

    if (!stickerUrl) {
      stickerUrl = createSampleStickersSvg(book.theme, book.childName);
    }

    setBook((prev) => ({
      ...prev,
      stickerSheet: {
        id: `stickers-${Date.now()}`,
        title: `${prev.childName}'s ${prev.theme} Printable Stickers`,
        imageUrl: stickerUrl,
        status: 'completed',
        prompt: `Printable cut-out sticker sheet for ${prev.theme}`,
      },
    }));
  };

  // Direct print printable sticker sheet
  const handlePrintStickerSheet = () => {
    if (!book.stickerSheet?.imageUrl) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Stickers - ${escapeHtml(book.childName)}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, sans-serif; }
            img { max-width: 95%; max-height: 88vh; object-fit: contain; }
            .inst { margin-top: 10px; font-size: 12px; font-weight: bold; color: #333; }
          </style>
        </head>
        <body>
          <img src="${book.stickerSheet.imageUrl}" onload="window.print(); window.close();" />
          <div class="inst">✂️ Cut along dashed lines with safety scissors and stick onto your colored pages!</div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Load a saved favorite book configuration
  const handleLoadFavorite = (favorite: FavoriteBook) => {
    setBook({
      id: favorite.id,
      theme: favorite.theme,
      childName: favorite.childName,
      title: favorite.title,
      subtitle: favorite.subtitle,
      dedication: favorite.dedication,
      difficulty: favorite.difficulty,
      resolution: favorite.resolution,
      aspectRatio: favorite.aspectRatio,
      coverImageUrl: favorite.coverImageUrl,
      coverStatus: 'completed',
      pages: favorite.pages,
      stickerSheet: favorite.stickerSheet || {
        id: `stickers-${Date.now()}`,
        title: `${favorite.childName}'s ${favorite.theme} Printable Stickers`,
        imageUrl: createSampleStickersSvg(favorite.theme, favorite.childName),
        status: 'completed',
      },
      createdAt: favorite.savedAt,
    });
    playChimeSound('fanfare');
    try {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Apply theme suggested in chat
  const handleApplyThemeFromChat = (themeName: string, notes?: string) => {
    setIsChatOpen(false);
    handleGenerateBook({
      theme: themeName,
      childName: book.childName,
      pageCount: book.pages.length,
      difficulty: book.difficulty || 'standard',
      resolution: book.resolution,
      aspectRatio: book.aspectRatio,
      userNotes: notes,
    });
  };

  // Save custom brand and logo integration settings
  const handleSaveBrandIntegration = (brand: BrandIntegration) => {
    setBook((prev) => ({
      ...prev,
      brandIntegration: brand,
    }));
    setIsBrandModalOpen(false);
    playChimeSound('fanfare');
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    } catch (e) {}
  };

  // Restore session from persistent IndexedDB
  const handleRestoreLastSession = () => {
    if (!autosavedSession || !autosavedSession.book) return;
    setBook(autosavedSession.book);
    setHistoryBooks(addBookToSessionHistory(autosavedSession.book));
    setShowRestoreBanner(false);
    playChimeSound('fanfare');
    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    } catch (e) {}
    const viewer = document.getElementById('coloring-book-viewer');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Re-load a book from current session history
  const handleLoadHistoryBook = (historyBook: ColoringBook) => {
    setBook(historyBook);
    playChimeSound('sparkle');
    const viewer = document.getElementById('coloring-book-viewer');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Remove a single book from session history
  const handleRemoveHistoryBook = (bookId: string) => {
    setHistoryBooks(removeBookFromSessionHistory(bookId));
  };

  // Clear all books from session history
  const handleClearHistory = () => {
    clearSessionHistory();
    setHistoryBooks([]);
  };

  // Scroll smoothly to the History section
  const handleScrollToHistory = () => {
    const el = document.getElementById('session-history-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-gray-900 flex flex-col selection:bg-amber-200">
      {/* Top Application Header */}
      <Header
        childName={book.childName}
        theme={book.theme}
        bookTitle={book.title}
        onOpenChat={() => setIsChatOpen(true)}
        onDownloadPdf={() => setIsPdfModalOpen(true)}
        onDirectPrint={() => setIsPdfModalOpen(true)}
        onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
        onOpenBrandModal={() => setIsBrandModalOpen(true)}
        onOpenWebsiteModal={() => setIsWebsiteModalOpen(true)}
        onOpenActivitiesModal={() => setIsActivitiesModalOpen(true)}
        brandIntegration={book.brandIntegration}
        hasCustomBrand={Boolean(book.brandIntegration?.enabled)}
        isGeneratingPdf={false}
        pageCount={book.pages.length}
        historyCount={historyBooks.length}
        onScrollToHistory={handleScrollToHistory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        {/* On page load: Restore Last Session banner if autosaved data exists */}
        {showRestoreBanner && autosavedSession && autosavedSession.book && (
          <RestoreSessionBanner
            savedBook={autosavedSession.book}
            savedAt={autosavedSession.savedAt}
            onRestore={handleRestoreLastSession}
            onDismiss={() => setShowRestoreBanner(false)}
          />
        )}

        {/* Active Generation Banner */}
        {isGeneratingBook && (
          <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
              <div>
                <p className="font-bold text-sm sm:text-base">
                  {generationProgressText}
                </p>
                <p className="text-xs text-amber-100">
                  Step {generationStep} of 7 • Generating black-and-white thick-line art in {book.resolution}
                </p>
              </div>
            </div>
            <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full shrink-0">
              Gemini 3 Pro Image Active
            </div>
          </div>
        )}

        {/* Generator Form */}
        <BookForm
          initialTheme={book.theme}
          initialChildName={book.childName}
          initialPageCount={book.pages.length}
          initialDifficulty={book.difficulty || 'standard'}
          initialActivityMode={book.activityMode || 'standard'}
          initialDedicationAuthor={book.dedicationAuthor || ''}
          initialResolution={book.resolution}
          initialAspectRatio={book.aspectRatio}
          isGenerating={isGeneratingBook}
          onGenerateBook={handleGenerateBook}
        />

        {/* Session History Section: View and quickly re-load up to 5 previously generated coloring books */}
        <HistorySection
          historyBooks={historyBooks}
          activeBookId={book.id}
          onLoadBook={handleLoadHistoryBook}
          onRemoveBook={handleRemoveHistoryBook}
          onClearHistory={handleClearHistory}
          hasAutosavedSession={Boolean(autosavedSession && autosavedSession.book)}
          autosavedBook={autosavedSession?.book}
          autosavedSavedAt={autosavedSession?.savedAt}
          onRestoreLastSession={handleRestoreLastSession}
          isAutoSaved={true}
        />

        {/* Coloring Book View: Custom Cover + Distinct Coloring Pages + Filmstrip Navigation */}
        <ColoringBookView
          book={book}
          onRegeneratePage={handleRegeneratePage}
          onRegenerateCover={handleRegenerateCover}
          onRegenerateStickers={handleRegenerateStickers}
          onEditPage={(page) => setEditingPage(page)}
          onPrintSinglePage={handlePrintSinglePage}
          onPrintStickerSheet={handlePrintStickerSheet}
          onLoadFavorite={handleLoadFavorite}
          onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
          onOpenPageReorder={() => setIsPageReorderOpen(true)}
          onOpenBatchRegenerate={() => setIsBatchModalOpen(true)}
          onUpdatePageBorder={handleUpdatePageBorder}
          onUpdateAllBorders={handleUpdateAllBorders}
          onSavePageArtwork={handleSavePageArtwork}
          onSaveVoiceAudio={handleSaveVoiceAudio}
          onAddHeroPage={handleAddHeroPage}
          onToggleQrCode={handleToggleQrCode}
          onUpdateCertificate={handleUpdateCertificate}
          onDownloadPdf={() => {
            setIsPdfBtnTooltipVisible(false);
            if (isPreparingBottomPdf) return;
            setIsPreparingBottomPdf(true);
            setPdfPrepProgress(15);
            playChimeSound('sparkle');

            // Dynamically step through progress ring while preparing PDF
            setTimeout(() => setPdfPrepProgress(45), 200);
            setTimeout(() => setPdfPrepProgress(78), 450);
            setTimeout(() => setPdfPrepProgress(100), 700);
            setTimeout(() => {
              setIsPreparingBottomPdf(false);
              setPdfPrepProgress(0);
              setIsPdfModalOpen(true);
            }, 920);
          }}
          isPreparingPdf={isPreparingBottomPdf}
          pdfProgress={pdfPrepProgress}
          isPdfBtnTooltipVisible={isPdfBtnTooltipVisible}
          setIsPdfBtnTooltipVisible={setIsPdfBtnTooltipVisible}
          isBookGenerationFinished={isBookGenerationFinished}
          isGeneratingBook={isGeneratingBook}
          onOpenBrandModal={() => setIsBrandModalOpen(true)}
          onOpenWebsiteModal={() => setIsWebsiteModalOpen(true)}
          onOpenActivitiesModal={() => setIsActivitiesModalOpen(true)}
        />
      </main>

      {/* Multi-turn Chat Assistant Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentTheme={book.theme}
        currentChildName={book.childName}
        onApplyTheme={handleApplyThemeFromChat}
      />

      {/* PDF Export & Print Configuration Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        book={book}
        onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
      />

      {/* Full-Screen PDF Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        book={book}
      />

      {/* Brand & Organization Logo Integration Modal */}
      <BrandIntegrationModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        brand={book.brandIntegration}
        onSave={handleSaveBrandIntegration}
      />

      {/* Website Integrations, Embed & Badges Modal */}
      <WebsiteIntegrationsModal
        isOpen={isWebsiteModalOpen}
        onClose={() => setIsWebsiteModalOpen(false)}
        book={book}
      />

      {/* Bonus Activities & Crafts Center Modal */}
      <BonusActivitiesModal
        isOpen={isActivitiesModalOpen}
        onClose={() => setIsActivitiesModalOpen(false)}
        book={book}
      />

      {/* Drag-and-Drop Page Story Arranger Modal */}
      <PageReorderModal
        isOpen={isPageReorderOpen}
        onClose={() => setIsPageReorderOpen(false)}
        pages={book.pages}
        childName={book.childName}
        onSaveOrder={handleReorderPages}
      />

      {/* 1-Click Batch Regenerate All Pages Modal */}
      <BatchRegenerateModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          if (!isBatchGenerating) {
            setIsBatchModalOpen(false);
          }
        }}
        currentTheme={book.theme}
        childName={book.childName}
        totalPages={book.pages.length}
        isGenerating={isBatchGenerating}
        progress={batchProgress}
        onBatchRegenerate={handleBatchRegenerateAll}
      />

      {/* Page Prompt / Details Editor Modal */}
      <PageEditorModal
        page={editingPage}
        onClose={() => setEditingPage(null)}
        isRegenerating={isRegeneratingSingle}
        onSaveAndRegenerate={async (pageId, updatedData) => {
          setIsRegeneratingSingle(true);
          try {
            // Update local fields first
            setBook((prev) => ({
              ...prev,
              pages: prev.pages.map((p) =>
                p.id === pageId
                  ? {
                      ...p,
                      title: updatedData.title,
                      storyCaption: updatedData.storyCaption,
                      prompt: updatedData.prompt,
                      resolution: updatedData.resolution,
                      funFactOrTip: updatedData.funFactOrTip,
                    }
                  : p
              ),
            }));

            // Call image regeneration with updated prompt and resolution
            await handleRegeneratePage(pageId, updatedData.prompt, updatedData.resolution);
          } finally {
            setIsRegeneratingSingle(false);
          }
        }}
      />
    </div>
  );
}
