import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BookForm } from './components/BookForm';
import { ColoringBookView } from './components/ColoringBookView';
import { ChatDrawer } from './components/ChatDrawer';
import { PdfExportModal } from './components/PdfExportModal';
import { PageEditorModal } from './components/PageEditorModal';
import { Tooltip } from './components/Tooltip';
import { ProgressRing } from './components/ProgressRing';
import { ColoringBook, ColoringPage, ImageResolution, AspectRatio, ColoringDifficulty, FavoriteBook } from './types';
import { DEFAULT_COLORING_BOOK, createSampleLineArtSvg, createSampleStickersSvg } from './utils/sampleData';
import { generateColoringBookPdf } from './utils/pdfGenerator';
import { playChimeSound } from './utils/kidAudio';
import { Sparkles, Printer, Download, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [book, setBook] = useState<ColoringBook>(DEFAULT_COLORING_BOOK);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [generationStep, setGenerationStep] = useState(0);

  // Modals & Drawers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ColoringPage | null>(null);
  const [isRegeneratingSingle, setIsRegeneratingSingle] = useState(false);
  const [isPreparingBottomPdf, setIsPreparingBottomPdf] = useState(false);
  const [pdfPrepProgress, setPdfPrepProgress] = useState(0);
  const [isBookGenerationFinished, setIsBookGenerationFinished] = useState(true);
  const [isPdfBtnTooltipVisible, setIsPdfBtnTooltipVisible] = useState(false);

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
    pageCount?: number;
    difficulty?: ColoringDifficulty;
    resolution: ImageResolution;
    aspectRatio: AspectRatio;
    userNotes?: string;
  }) => {
    const targetPageCount = Math.max(1, Math.min(12, options.pageCount || 5));
    const targetDifficulty: ColoringDifficulty = options.difficulty || 'standard';
    const explicitTitle = options.customTitle?.trim() || '';
    setIsBookGenerationFinished(false);
    setIsGeneratingBook(true);
    setGenerationStep(1);
    const difficultyLabel =
      targetDifficulty === 'toddler' ? 'toddler lines' : targetDifficulty === 'intricate' ? 'intricate patterns' : 'standard outlines';
    setGenerationProgressText(`Planning ${targetPageCount} story scenes (${difficultyLabel}) for ${options.childName}...`);

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
            pageCount: targetPageCount,
            difficulty: targetDifficulty,
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

      // If plan API had an issue, synthesize structured scenes with fun facts and tips
      if (!planData || !planData.pages || planData.pages.length === 0) {
        const promptStylePrefix =
          targetDifficulty === 'toddler'
            ? "Toddler coloring book page, simple thick lines for toddlers, ultra-bold heavy black outlines, giant open shapes for chunky crayons, zero clutter, minimal elements, pure white background"
            : targetDifficulty === 'intricate'
            ? "Intricate coloring book page for older children, intricate patterns for older children, detailed crisp black line art, decorative zentangles, ornate background scenery, complex detailed coloring sections, pure white background"
            : "Children's coloring book page, bold thick crisp black outlines, pure white background, clear recognizable shapes, playful fun details, large open shapes for coloring";

        const defaultScenes = [
          {
            title: `The Journey Begins with ${options.theme}`,
            caption: `${options.childName}'s great adventure begins today with happy smiles!`,
            tip: `Coloring Tip: Give the character a bright sunshine yellow smile!`,
            prompt: `${promptStylePrefix}, cute friendly ${options.theme} waving hello`,
          },
          {
            title: `Exploring the ${options.theme} World`,
            caption: `Look at all the magical discoveries waiting to be explored!`,
            tip: `Fun Fact: Exploring new places helps your imagination grow as tall as a giant!`,
            prompt: `${promptStylePrefix}, ${options.theme} exploring with cute gadgets`,
          },
          {
            title: `A Playful ${options.theme} Friend`,
            caption: `Sharing snacks and playing games with good friends!`,
            tip: `Coloring Tip: Try coloring the background with cool sky blues and grass greens!`,
            prompt: `${promptStylePrefix}, ${options.theme} having a picnic or playing games with friends`,
          },
          {
            title: `The Big Exciting Discovery`,
            caption: `Look up high! A wonderful surprise shines bright in the sky!`,
            tip: `Fun Fact: Stars in outer space can twinkle in shades of red, white, and blue!`,
            prompt: `${promptStylePrefix}, ${options.theme} discovering a glowing treasure or starry prize`,
          },
          {
            title: `Celebration & Sweet Dreams`,
            caption: `A happy celebration for ${options.childName}'s brave adventure!`,
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
            funFactOrTip: scene.tip,
            imagePrompt: scene.prompt,
          });
        }

        const coverPromptPrefix =
          targetDifficulty === 'toddler'
            ? "Toddler coloring book cover, simple thick lines for toddlers, ultra-bold heavy black outlines, giant open shapes, pure white background"
            : targetDifficulty === 'intricate'
            ? "Intricate coloring book cover for older children, intricate patterns for older children, detailed crisp black line art, decorative zentangles, pure white background"
            : "Children's coloring book cover, bold thick black outlines, pure white background";

        planData = {
          bookTitle: explicitTitle || `${options.childName}'s ${options.theme} Adventure`,
          subtitle: `A ${targetPageCount}-Page Coloring Journey filled with Fun!`,
          dedication: `Created with love especially for ${options.childName} • Happy Coloring!`,
          coverPrompt: `${coverPromptPrefix}, cute ${options.theme} character smiling with decorative stars`,
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
        funFactOrTip: p.funFactOrTip || `Coloring tip: Try using your favorite bright colors here!`,
        prompt: p.imagePrompt || `Children's coloring book page of ${options.theme}`,
        status: 'generating',
        resolution: options.resolution,
      }));

      const newBook: ColoringBook = {
        id: `book-${Date.now()}`,
        theme: options.theme,
        childName: options.childName,
        difficulty: targetDifficulty,
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

      // Step 2: Generate Cover Art
      setGenerationStep(2);
      setGenerationProgressText(`Drawing custom cover in ${options.resolution} (${difficultyLabel}) using Gemini 3 Pro...`);

      let coverUrl = '';
      try {
        const coverRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
        console.warn('Cover image API failed, using vector SVG fallback:', err);
      }

      if (!coverUrl) {
        coverUrl = createSampleLineArtSvg('space_dino_1', `${options.childName.toUpperCase()}'S COVER`);
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
          }
        } catch (pageGenErr) {
          console.warn(`Page ${pageNum} generation failed, using line-art fallback:`, pageGenErr);
        }

        if (!pageImgUrl) {
          const sampleTypes = ['space_dino_1', 'space_dino_2', 'space_dino_3', 'space_dino_4', 'space_dino_5'];
          pageImgUrl = createSampleLineArtSvg(sampleTypes[i % sampleTypes.length], `PAGE ${pageNum}: ${newPages[i].title}`);
        }

        // Update this page in book state
        setBook((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === i
              ? { ...p, imageUrl: pageImgUrl, status: 'completed' }
              : p
          ),
        }));
      }

      // Success celebration!
      setIsBookGenerationFinished(true);
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
      let newUrl = '';
      if (data.success && data.imageUrl) {
        newUrl = data.imageUrl;
      } else {
        newUrl = createSampleLineArtSvg('space_dino_2', `PAGE ${pageToRegen.pageNumber}`);
      }

      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? { ...p, imageUrl: newUrl, status: 'completed', resolution: resolution || p.resolution }
            : p
        ),
      }));
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
  const handleRegenerateCover = async () => {
    setBook((prev) => ({ ...prev, coverStatus: 'generating' }));
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: book.coverPrompt || `Children's coloring book cover of ${book.theme}`,
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
        newCoverUrl = createSampleLineArtSvg('space_dino_1', `${book.childName.toUpperCase()}'S COVER`);
      }

      setBook((prev) => ({
        ...prev,
        coverImageUrl: newCoverUrl,
        coverStatus: 'completed',
      }));
    } catch (e) {
      setBook((prev) => ({ ...prev, coverStatus: 'completed' }));
    }
  };

  // Print single page
  const handlePrintSinglePage = async (page: ColoringPage) => {
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
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      console.error('Error printing single page:', err);
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
          <title>Print Stickers - ${book.childName}</title>
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
        isGeneratingPdf={false}
        pageCount={book.pages.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
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
          initialResolution={book.resolution}
          initialAspectRatio={book.aspectRatio}
          isGenerating={isGeneratingBook}
          onGenerateBook={handleGenerateBook}
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
