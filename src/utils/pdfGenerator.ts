import { jsPDF } from 'jspdf';
import { ColoringBook } from '../types';

export interface GeneratePdfOptions {
  includeCover?: boolean;
  includeStickers?: boolean;
  paperSize?: 'letter' | 'a4';
  includeCaptions?: boolean;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Builds a clean, professional, high-contrast black-and-white printable coloring book PDF
 * with a customized cover page and 5 distinct coloring scenes.
 */
export async function generateColoringBookPdf(
  book: ColoringBook,
  options: GeneratePdfOptions = {}
): Promise<jsPDF> {
  const {
    includeCover = true,
    includeStickers = true,
    paperSize = 'letter',
    includeCaptions = true,
    onProgress,
  } = options;

  onProgress?.(10, 'Initializing PDF document...');

  // Dimensions in millimeters for standard US Letter or A4
  const isA4 = paperSize === 'a4';
  const pageWidth = isA4 ? 210 : 215.9;
  const pageHeight = isA4 ? 297 : 279.4;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize,
    compress: true,
  });

  const childNameUpper = (book.childName || 'Little Artist').trim().toUpperCase();
  const themeTitle = book.title || `${book.childName}'s Coloring Book`;

  // ----------------------------------------------------
  // PAGE 1: CUSTOM COVER PAGE
  // ----------------------------------------------------
  if (includeCover) {
    onProgress?.(25, "Designing custom cover page for " + book.childName + "...");

    // Outer double border (classic coloring book style)
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(1.5);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 4, 4);

    doc.setLineWidth(0.6);
    doc.roundedRect(14.5, 14.5, pageWidth - 29, pageHeight - 29, 3, 3);

    // Corner decorative stars/crosses
    drawCornerDeco(doc, 19, 19);
    drawCornerDeco(doc, pageWidth - 19, 19);
    drawCornerDeco(doc, 19, pageHeight - 19);
    drawCornerDeco(doc, pageWidth - 19, pageHeight - 19);

    // Top Header Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('★ PERSONALIZED COLORING BOOK ★', pageWidth / 2, 26, { align: 'center' });

    // Child's Name Display
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(20, 20, 20);
    doc.text(`${childNameUpper}'S`, pageWidth / 2, 38, { align: 'center' });

    // Main Book Title
    doc.setFontSize(20);
    const titleLines = doc.splitTextToSize(book.title || `${book.theme} Adventure`, pageWidth - 45);
    doc.text(titleLines, pageWidth / 2, 48, { align: 'center' });

    // Subtitle / Dedication
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(80, 80, 80);
    const subText = book.subtitle || `A special coloring journey filled with fun and creativity!`;
    doc.text(subText, pageWidth / 2, 57, { align: 'center' });

    // Cover Artwork Box
    const coverBoxY = 65;
    const coverBoxSize = 135;
    const coverBoxX = (pageWidth - coverBoxSize) / 2;

    if (book.coverImageUrl) {
      try {
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(1);
        doc.rect(coverBoxX, coverBoxY, coverBoxSize, coverBoxSize);
        doc.addImage(book.coverImageUrl, 'PNG', coverBoxX + 1, coverBoxY + 1, coverBoxSize - 2, coverBoxSize - 2);
      } catch (err) {
        console.warn('Could not render cover image into PDF:', err);
        drawCoverPlaceholder(doc, coverBoxX, coverBoxY, coverBoxSize, book);
      }
    } else if (book.pages[0]?.imageUrl) {
      // Use first page art as featured cover art
      try {
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(1);
        doc.rect(coverBoxX, coverBoxY, coverBoxSize, coverBoxSize);
        doc.addImage(book.pages[0].imageUrl, 'PNG', coverBoxX + 1, coverBoxY + 1, coverBoxSize - 2, coverBoxSize - 2);
      } catch (e) {
        drawCoverPlaceholder(doc, coverBoxX, coverBoxY, coverBoxSize, book);
      }
    } else {
      drawCoverPlaceholder(doc, coverBoxX, coverBoxY, coverBoxSize, book);
    }

    // "Color Your Own Cover" / Artist Dedication Box
    const bottomY = pageHeight - 48;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.8);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth / 2 - 65, bottomY, 130, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`★ MASTER ARTIST: ${childNameUpper} ★`, pageWidth / 2, bottomY + 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text(book.dedication || `Created with love for ${book.childName} • Grab your crayons!`, pageWidth / 2, bottomY + 14, { align: 'center' });
    const totalPages = book.pages.length;
    doc.text(`Theme: ${book.theme} • ${totalPages} Full-Size Printable Pages`, pageWidth / 2, bottomY + 20, { align: 'center' });
  }

  // ----------------------------------------------------
  // PAGES 2+: DISTINCT COLORING PAGES
  // ----------------------------------------------------
  const pagesToRender = book.pages;
  const totalPages = pagesToRender.length;

  for (let i = 0; i < pagesToRender.length; i++) {
    const page = pagesToRender[i];
    const pageNum = i + 1;
    const progressPercent = 30 + Math.round((i / Math.max(1, totalPages)) * 65);
    onProgress?.(progressPercent, `Embedding coloring page ${pageNum} of ${totalPages}...`);

    // Add new page if cover was included or it's not the first page
    if (includeCover || i > 0) {
      doc.addPage(paperSize, 'portrait');
    }

    // Clean page border
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Page Top Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${childNameUpper}'S COLORING BOOK`, 18, 20);
    doc.text(`PAGE ${pageNum} OF ${totalPages}`, pageWidth - 18, 20, { align: 'right' });

    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(18, 22.5, pageWidth - 18, 22.5);

    // Scene Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    const sceneTitle = `${pageNum}. ${page.title || `Coloring Scene ${pageNum}`}`;
    doc.text(sceneTitle, pageWidth / 2, 30.5, { align: 'center' });

    // Coloring Image Frame
    const imageBoxY = 34;
    const maxImgWidth = pageWidth - 40; // e.g. ~176mm
    const maxImgHeight = pageHeight - 96; // Leave room for caption & fun fact box

    // Calculate dimensions based on aspect ratio (default 3:4 portrait or 1:1)
    let imgW = maxImgWidth;
    let imgH = maxImgHeight;

    if (book.aspectRatio === '1:1') {
      const squareSize = Math.min(maxImgWidth, maxImgHeight);
      imgW = squareSize;
      imgH = squareSize;
    } else {
      // 3:4 portrait ratio
      const calculatedH = imgW * (4 / 3);
      if (calculatedH <= maxImgHeight) {
        imgH = calculatedH;
      } else {
        imgH = maxImgHeight;
        imgW = imgH * (3 / 4);
      }
    }

    const imgX = (pageWidth - imgW) / 2;

    if (page.imageUrl) {
      try {
        // Subtle outer boundary guide line for clean coloring page edge
        doc.setDrawColor(20, 20, 20);
        doc.setLineWidth(0.5);
        doc.rect(imgX, imageBoxY, imgW, imgH);
        doc.addImage(page.imageUrl, 'PNG', imgX + 0.5, imageBoxY + 0.5, imgW - 1, imgH - 1);
      } catch (err) {
        console.warn(`Error drawing page ${pageNum} image into PDF:`, err);
        drawPageIllustrationFallback(doc, imgX, imageBoxY, imgW, imgH, page);
      }
    } else {
      drawPageIllustrationFallback(doc, imgX, imageBoxY, imgW, imgH, page);
    }

    let nextContentY = imageBoxY + imgH + 4.5;

    // Story Caption (kid-friendly rhyming text or scene line)
    if (includeCaptions && page.storyCaption) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);

      const captionLines = doc.splitTextToSize(`"${page.storyCaption}"`, pageWidth - 42);
      doc.text(captionLines, pageWidth / 2, nextContentY, { align: 'center' });
      nextContentY += captionLines.length * 4.2 + 2;
    }

    // Small Text Box with Coloring Suggestion or Fun Fact
    if (page.funFactOrTip) {
      const boxW = pageWidth - 42;
      const boxH = 13.5;
      const boxX = (pageWidth - boxW) / 2;
      const boxY = Math.min(nextContentY, pageHeight - 33);

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.4);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');

      // Mini header inside box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      doc.text('★ COLORING TIP & FUN FACT:', boxX + 3.5, boxY + 4.2);

      // Tip content inside box
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(50, 50, 50);
      const tipLines = doc.splitTextToSize(page.funFactOrTip, boxW - 7);
      doc.text(tipLines.slice(0, 2), boxX + 3.5, boxY + 8.5);
    }

    // Footer
    const footerY = pageHeight - 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`★ Made for ${book.childName} • Theme: ${book.theme} • Have fun coloring! ★`, pageWidth / 2, footerY, {
      align: 'center',
    });
  }

  // ----------------------------------------------------
  // BONUS PAGE: PRINTABLE THEMED STICKER SHEET
  // ----------------------------------------------------
  if (includeStickers && book.stickerSheet?.imageUrl) {
    onProgress?.(95, `Adding bonus printable sticker sheet for ${book.childName}...`);
    doc.addPage();

    // Outer margin border
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(1.2);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3);

    // Decorative corners
    drawCornerDeco(doc, 18, 18);
    drawCornerDeco(doc, pageWidth - 18, 18);
    drawCornerDeco(doc, 18, pageHeight - 18);
    drawCornerDeco(doc, pageWidth - 18, pageHeight - 18);

    // Header Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('✂️ BONUS: PRINTABLE CUT-OUT STICKERS ✂️', pageWidth / 2, 24, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      'Carefully cut along the dashed lines with child safety scissors and stick onto your colored pages!',
      pageWidth / 2,
      30,
      { align: 'center' }
    );

    // Sticker Image / Layout
    const stickerMargin = 16;
    const stickerW = pageWidth - stickerMargin * 2;
    const stickerH = pageHeight - 56;
    const stickerY = 34;

    try {
      doc.addImage(
        book.stickerSheet.imageUrl,
        book.stickerSheet.imageUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG',
        stickerMargin,
        stickerY,
        stickerW,
        stickerH,
        undefined,
        'FAST'
      );
    } catch (stickerErr) {
      console.warn('Direct sticker addImage issue, rendering fallback outline:', stickerErr);
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(1);
      doc.rect(stickerMargin, stickerY, stickerW, stickerH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("Theme Sticker Sheet: " + book.theme, pageWidth / 2, stickerY + stickerH / 2, { align: 'center' });
    }

    // Footer
    const stickerFooterY = pageHeight - 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `★ Made for ${book.childName} • Cut & Stick Activity Sheet • ${book.theme} ★`,
      pageWidth / 2,
      stickerFooterY,
      { align: 'center' }
    );
  }

  onProgress?.(100, 'PDF ready for printing and download!');
  return doc;
}

// Helpers for decorative elements
function drawCornerDeco(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.6);
  doc.line(x - 2, y, x + 2, y);
  doc.line(x, y - 2, x, y + 2);
}

function drawCoverPlaceholder(doc: jsPDF, x: number, y: number, size: number, book: ColoringBook) {
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(1);
  doc.rect(x, y, size, size);

  // Decorative inner drawing lines
  doc.setLineWidth(0.4);
  doc.line(x + 10, y + 10, x + size - 10, y + 10);
  doc.line(x + 10, y + size - 10, x + size - 10, y + size - 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('COLOR YOUR OWN COVER!', x + size / 2, y + size / 2 - 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Theme: ${book.theme}`, x + size / 2, y + size / 2 + 2, { align: 'center' });
  doc.text('Draw a picture here or paste a photo!', x + size / 2, y + size / 2 + 12, { align: 'center' });
}

function drawPageIllustrationFallback(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  page: any
) {
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(1);
  doc.rect(x, y, w, h);

  // Cross lines to color
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(page.title || 'Coloring Page', x + w / 2, y + h / 2 - 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text('(Image generating or click Regenerate to generate line art)', x + w / 2, y + h / 2 + 4, { align: 'center' });
}
