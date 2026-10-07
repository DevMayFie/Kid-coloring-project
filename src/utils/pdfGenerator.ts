import { jsPDF } from 'jspdf';
import { ColoringBook, ColoringPage, PageBorderStyle, PrintLayoutMode } from '../types';
import { generateQrCodeDataUrl } from './qrCodeGenerator';
import { generateMaze } from './mazeGenerator';
import { createThematicCoverSvg } from './coverIllustrationGenerator';

/**
 * Safely converts any image source (including SVG data URIs, WebP, etc.)
 * into a standard base64 PNG data URL that jsPDF addImage can decode without errors.
 */
async function prepareRasterPng(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:image/png;base64,')) {
    return src;
  }
  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(img.naturalWidth || 1200, 1200);
          canvas.height = Math.max(img.naturalHeight || 1600, 1600);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          // ignore error
        }
        resolve(src);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }
  return src;
}

export interface GeneratePdfOptions {
  includeCover?: boolean;
  includeDedicationPage?: boolean;
  includeCertificate?: boolean;
  includeStickers?: boolean;
  includeQrCode?: boolean;
  paperSize?: 'letter' | 'a4';
  includeCaptions?: boolean;
  includeDrawYourEnding?: boolean;
  includeCrayonSwatches?: boolean;
  includeBonusActivities?: boolean;
  printLayout?: PrintLayoutMode;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Builds a clean, professional, high-contrast black-and-white printable coloring book PDF
 * with a customized cover page, dedication page, distinct coloring scenes, and master artist certificate.
 */
export async function generateColoringBookPdf(
  book: ColoringBook,
  options: GeneratePdfOptions = {}
): Promise<jsPDF> {
  const {
    includeCover = true,
    includeDedicationPage = true,
    includeCertificate = true,
    includeStickers = true,
    includeQrCode = true,
    paperSize = 'letter',
    includeCaptions = true,
    includeDrawYourEnding = true,
    includeCrayonSwatches = true,
    includeBonusActivities = true,
    printLayout = 'standard',
    onProgress,
  } = options;

  onProgress?.(10, 'Initializing PDF document...');

  // Pre-generate corner QR code for audio read-along story or website integration
  let qrCodeDataUrl: string | null = null;
  const brand = book.brandIntegration;
  const targetUrl =
    brand?.enabled && brand.websiteUrl
      ? brand.websiteUrl
      : typeof window !== 'undefined'
      ? window.location.href
      : 'https://ai.studio';

  if (includeQrCode || (brand?.enabled && brand.showWebsiteQrCode)) {
    try {
      qrCodeDataUrl = await generateQrCodeDataUrl(targetUrl, 140);
    } catch (e) {
      console.warn('QR code generation skipped:', e);
    }
  }

  // Branch directly to Booklet Generator if requested
  if (printLayout === 'booklet') {
    return generateBookletPdf(book, options, qrCodeDataUrl);
  }

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
    onProgress?.(20, "Designing custom cover page for " + book.childName + "...");

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

    const rawCover =
      book.coverImageUrl ||
      createThematicCoverSvg(book.theme, book.childName, book.difficulty || 'standard');
    const rasterCover = await prepareRasterPng(rawCover);

    if (rasterCover) {
      try {
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(1);
        doc.rect(coverBoxX, coverBoxY, coverBoxSize, coverBoxSize);
        doc.addImage(rasterCover, 'PNG', coverBoxX + 1, coverBoxY + 1, coverBoxSize - 2, coverBoxSize - 2);
      } catch (err) {
        console.warn('Could not render cover image into PDF:', err);
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

    // Brand / Organization Logo & Website Presentation
    if (book.brandIntegration?.enabled && book.brandIntegration.showOnCover) {
      const brandInfo = book.brandIntegration;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const displayUrl = brandInfo.websiteUrl ? ` • ${brandInfo.websiteUrl.replace(/^https?:\/\//, '')}` : '';
      const sponsorText = `${brandInfo.tagline || 'Presented by'}: ${brandInfo.organizationName || 'Our Partner'}${displayUrl}`;
      doc.text(sponsorText, pageWidth / 2, pageHeight - 14, { align: 'center' });
    }
  }

  // ----------------------------------------------------
  // PAGE 2: INSIDE-COVER CUSTOM DEDICATION & COLOR TESTER
  // ----------------------------------------------------
  if (includeDedicationPage) {
    onProgress?.(30, `Adding special dedication page for ${book.childName}...`);
    if (includeCover) {
      doc.addPage(paperSize, 'portrait');
    }

    drawDedicationPage(doc, pageWidth, pageHeight, book);
  }

  // ----------------------------------------------------
  // PAGES 3+: DISTINCT COLORING PAGES
  // ----------------------------------------------------
  const pagesToRender = book.pages;
  const totalPages = pagesToRender.length;

  for (let i = 0; i < pagesToRender.length; i++) {
    const page = pagesToRender[i];
    const pageNum = i + 1;
    const progressPercent = 35 + Math.round((i / Math.max(1, totalPages)) * 50);
    onProgress?.(progressPercent, `Embedding coloring page ${pageNum} of ${totalPages}...`);

    // Add new page if cover or dedication was included, or if not the first iteration
    if (includeCover || includeDedicationPage || i > 0) {
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

    // Scene Title & Activity Mode Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(20, 20, 20);
    const sceneTitle = `${pageNum}. ${page.title || `Coloring Scene ${pageNum}`}`;
    doc.text(sceneTitle, pageWidth / 2, 29.5, { align: 'center' });

    // Optional Color by Numbers Legend Key Banner
    let topOffset = 33;
    if (page.numberLegend && page.numberLegend.length > 0) {
      const legendW = pageWidth - 36;
      const legendH = 8;
      const legendX = (pageWidth - legendW) / 2;
      doc.setDrawColor(180, 180, 180);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(legendX, topOffset, legendW, legendH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);

      const itemsCount = page.numberLegend.length;
      const colW = legendW / itemsCount;
      page.numberLegend.forEach((item, idx) => {
        const itemCenterX = legendX + colW * idx + colW / 2;
        doc.text(`[${item.number}] ${item.colorName}`, itemCenterX, topOffset + 5.2, { align: 'center' });
      });

      topOffset += legendH + 2.5;
    }

    // Coloring Image Frame
    const imageBoxY = topOffset;
    const maxImgWidth = pageWidth - 40;
    const maxImgHeight = pageHeight - topOffset - 68;

    let imgW = maxImgWidth;
    let imgH = maxImgHeight;

    if (book.aspectRatio === '1:1') {
      const squareSize = Math.min(maxImgWidth, maxImgHeight);
      imgW = squareSize;
      imgH = squareSize;
    } else {
      const calculatedH = imgW * (4 / 3);
      if (calculatedH <= maxImgHeight) {
        imgH = calculatedH;
      } else {
        imgH = maxImgHeight;
        imgW = imgH * (3 / 4);
      }
    }

    const imgX = (pageWidth - imgW) / 2;
    const pageBorder = page.borderStyle || book.defaultBorderStyle || 'classic-double';
    const effectiveImgUrl = page.coloredImageUrl || page.imageUrl;
    const rasterPageImg = await prepareRasterPng(effectiveImgUrl);

    if (rasterPageImg) {
      try {
        doc.addImage(rasterPageImg, 'PNG', imgX + 0.5, imageBoxY + 0.5, imgW - 1, imgH - 1);
        drawCustomPageBorderPdf(doc, pageBorder, imgX, imageBoxY, imgW, imgH);
      } catch (err) {
        console.warn(`Error drawing page ${pageNum} image into PDF:`, err);
        drawPageIllustrationFallback(doc, imgX, imageBoxY, imgW, imgH, page);
        drawCustomPageBorderPdf(doc, pageBorder, imgX, imageBoxY, imgW, imgH);
      }
    } else {
      drawPageIllustrationFallback(doc, imgX, imageBoxY, imgW, imgH, page);
      drawCustomPageBorderPdf(doc, pageBorder, imgX, imageBoxY, imgW, imgH);
    }

    let nextContentY = imageBoxY + imgH + 4;

    // Story Caption (English)
    if (includeCaptions && page.storyCaption) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);

      const captionLines = doc.splitTextToSize(`"${page.storyCaption}"`, pageWidth - 42);
      doc.text(captionLines, pageWidth / 2, nextContentY, { align: 'center' });
      nextContentY += captionLines.length * 4.2 + 1.5;
    }

    // Bilingual Secondary Caption
    if (includeCaptions && page.secondaryCaption) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      const secondaryLines = doc.splitTextToSize(`★ ${page.secondaryCaption}`, pageWidth - 44);
      doc.text(secondaryLines, pageWidth / 2, nextContentY, { align: 'center' });
      nextContentY += secondaryLines.length * 3.8 + 1.5;
    }

    // Fun Fact or Tip Box
    // Crayon Swatch Guide
    if (includeCrayonSwatches) {
      const guideW = qrCodeDataUrl ? pageWidth - 60 : pageWidth - 42;
      const guideX = qrCodeDataUrl ? 18 : (pageWidth - guideW) / 2;
      const guideY = pageHeight - 27;
      drawCrayonSwatchGuide(doc, guideX, guideY, guideW, page, book.theme);
    } else if (page.funFactOrTip) {
      const boxW = qrCodeDataUrl ? pageWidth - 60 : pageWidth - 42;
      const boxH = 12;
      const boxX = qrCodeDataUrl ? 18 : (pageWidth - boxW) / 2;
      const boxY = Math.min(nextContentY, pageHeight - 31);

      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(40, 40, 40);
      doc.text('★ COLORING TIP & FUN FACT:', boxX + 3.5, boxY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      const tipLines = doc.splitTextToSize(page.funFactOrTip, boxW - 7);
      doc.text(tipLines.slice(0, 2), boxX + 3.5, boxY + 8);
    }

    // Corner QR Code for Physical Printouts
    if (qrCodeDataUrl) {
      try {
        const qrSize = 13;
        const qrX = pageWidth - 26;
        const qrY = pageHeight - 27;
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.5);
        doc.setTextColor(70, 70, 70);
        doc.text('SCAN FOR AUDIO', qrX + qrSize / 2, qrY + qrSize + 2.2, { align: 'center' });
      } catch (qrErr) {
        console.warn('Could not draw QR code onto page:', qrErr);
      }
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);

    const brandInfo = book.brandIntegration;
    let footerLabel = qrCodeDataUrl
      ? `★ Made for ${book.childName} • Page ${pageNum} of ${totalPages} ★`
      : `★ Made for ${book.childName} • Theme: ${book.theme} • Have fun coloring! ★`;

    if (brandInfo?.enabled && brandInfo.showOnPageFooter && brandInfo.organizationName) {
      const displayUrl = brandInfo.websiteUrl ? ` • ${brandInfo.websiteUrl.replace(/^https?:\/\//, '')}` : '';
      footerLabel = `★ ${brandInfo.organizationName}${displayUrl} • Made for ${book.childName} • Page ${pageNum} of ${totalPages} ★`;
    }

    doc.text(footerLabel, (pageWidth - (qrCodeDataUrl ? 20 : 0)) / 2, footerY, {
      align: 'center',
    });
  }

  // ----------------------------------------------------
  // BONUS ACTIVITY: DRAW YOUR OWN ENDING
  // ----------------------------------------------------
  if (includeDrawYourEnding) {
    onProgress?.(84, `Adding Draw-Your-Own-Ending bonus activity for ${book.childName}...`);
    drawDrawYourOwnEndingPage(doc, pageWidth, pageHeight, book);
  }

  // ----------------------------------------------------
  // BONUS ACTIVITIES: THEMED MAZE & CUT-OUT CRAFTS
  // ----------------------------------------------------
  if (includeBonusActivities) {
    onProgress?.(86, `Adding Themed Maze Adventure & DIY Bookmarks for ${book.childName}...`);
    drawThemedMazePdfPage(doc, pageWidth, pageHeight, book);
    drawCutOutCraftsPdfPage(doc, pageWidth, pageHeight, book);
  }

  // ----------------------------------------------------
  // BONUS PAGE: PRINTABLE THEMED STICKER SHEET
  // ----------------------------------------------------
  if (includeStickers && book.stickerSheet?.imageUrl) {
    onProgress?.(88, `Adding bonus printable sticker sheet for ${book.childName}...`);
    doc.addPage();

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(1.2);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3);

    drawCornerDeco(doc, 18, 18);
    drawCornerDeco(doc, pageWidth - 18, 18);
    drawCornerDeco(doc, 18, pageHeight - 18);
    drawCornerDeco(doc, pageWidth - 18, pageHeight - 18);

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

    const stickerMargin = 16;
    const stickerW = pageWidth - stickerMargin * 2;
    const stickerH = pageHeight - 56;
    const stickerY = 34;

    const rasterSticker = await prepareRasterPng(book.stickerSheet.imageUrl);

    if (rasterSticker) {
      try {
        doc.addImage(
          rasterSticker,
          'PNG',
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
    } else {
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(1);
      doc.rect(stickerMargin, stickerY, stickerW, stickerH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("Theme Sticker Sheet: " + book.theme, pageWidth / 2, stickerY + stickerH / 2, { align: 'center' });
    }

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

  // ----------------------------------------------------
  // FINAL PAGE: PRINTABLE "MASTER ARTIST" DIPLOMA
  // ----------------------------------------------------
  if (includeCertificate) {
    onProgress?.(95, `Generating official Master Artist Completion Diploma for ${book.childName}...`);
    doc.addPage(paperSize, 'landscape');
    const certW = pageHeight; // in landscape orientation
    const certH = pageWidth;
    drawCertificatePage(doc, certW, certH, book);
  }

  onProgress?.(100, 'PDF ready for printing and download!');
  return doc;
}

/**
 * Draws an inside-cover dedication page with crayon swatch testing area
 */
function drawDedicationPage(doc: jsPDF, pageWidth: number, pageHeight: number, book: ColoringBook) {
  // Border
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(1.2);
  doc.roundedRect(14, 14, pageWidth - 28, pageHeight - 28, 4, 4);
  doc.setLineWidth(0.5);
  doc.roundedRect(17, 17, pageWidth - 34, pageHeight - 34, 3, 3);

  // Decorative corners
  drawCornerDeco(doc, 22, 22);
  drawCornerDeco(doc, pageWidth - 22, 22);
  drawCornerDeco(doc, 22, pageHeight - 22);
  drawCornerDeco(doc, pageWidth - 22, pageHeight - 22);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('★ THIS COLORING BOOK BELONGS TO ★', pageWidth / 2, 34, { align: 'center' });

  // Child Name Frame
  const nameBoxW = pageWidth - 60;
  const nameBoxH = 24;
  const nameBoxX = (pageWidth - nameBoxW) / 2;
  const nameBoxY = 40;

  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.8);
  doc.setFillColor(254, 254, 254);
  doc.roundedRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(book.childName || 'Little Artist', pageWidth / 2, nameBoxY + 15, { align: 'center' });

  // Dedication Note Section
  let currentY = nameBoxY + nameBoxH + 15;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);

  const author = book.dedicationAuthor ? `From: ${book.dedicationAuthor}` : 'Dedicated with love';
  doc.text(`★ ${author} ★`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  const dedicationMessage =
    book.dedication ||
    `May your world always be full of bright colors, grand adventures, and boundless imagination!`;
  const dedLines = doc.splitTextToSize(`"${dedicationMessage}"`, pageWidth - 60);
  doc.text(dedLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += dedLines.length * 5 + 14;

  // Swatch testing area: "My Favorite Colors Test Zone"
  const swatchAreaY = currentY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('🎨 COLOR TESTING PALETTE 🎨', pageWidth / 2, swatchAreaY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Test your crayons and markers in the magic circles below before you begin!', pageWidth / 2, swatchAreaY + 6, {
    align: 'center',
  });

  const circlesY = swatchAreaY + 18;
  const numCircles = 6;
  const radius = 9;
  const spacing = (pageWidth - 60) / numCircles;
  const startX = 30 + spacing / 2;

  for (let i = 0; i < numCircles; i++) {
    const cx = startX + i * spacing;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.7);
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, circlesY, radius, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${i + 1}`, cx, circlesY + 2.5, { align: 'center' });
  }

  // Little Artist Signature and Date lines at the bottom
  const sigY = pageHeight - 42;
  const col1X = 35;
  const col2X = pageWidth - 75;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.5);
  doc.line(col1X, sigY, col1X + 45, sigY);
  doc.line(col2X, sigY, col2X + 45, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Artist's Signature", col1X + 22.5, sigY + 5, { align: 'center' });
  doc.text('Date Started', col2X + 22.5, sigY + 5, { align: 'center' });
}

/**
 * Draws an official Master Artist Certificate of Completion (Landscape orientation)
 */
function drawCertificatePage(doc: jsPDF, certW: number, certH: number, book: ColoringBook) {
  // Classic certificate border
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.8);
  doc.roundedRect(12, 12, certW - 24, certH - 24, 4, 4);

  doc.setLineWidth(0.6);
  doc.roundedRect(15, 15, certW - 30, certH - 30, 3, 3);

  // Decorative certificate corners
  drawCornerDeco(doc, 20, 20);
  drawCornerDeco(doc, certW - 20, 20);
  drawCornerDeco(doc, 20, certH - 20);
  drawCornerDeco(doc, certW - 20, certH - 20);

  // Top Crest / Emblem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(120, 90, 20);
  doc.text('★ ★ ★ OFFICIAL CERTIFICATE OF COMPLETION ★ ★ ★', certW / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text('MASTER ARTIST AWARD', certW / 2, 42, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('This distinguished honor is proudly presented to:', certW / 2, 53, { align: 'center' });

  // Recipient Child Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(20, 20, 20);
  const childUpper = (book.childName || 'Champion Colorist').trim().toUpperCase();
  doc.text(childUpper, certW / 2, 68, { align: 'center' });

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.8);
  doc.line(certW / 2 - 60, 72, certW / 2 + 60, 72);

  // Certificate Citation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const citation = `For extraordinary creativity, joyful colors, and successfully completing all ${book.pages.length} pages of the "${book.title || book.theme}" Coloring Adventure!`;
  const citeLines = doc.splitTextToSize(citation, certW - 70);
  doc.text(citeLines, certW / 2, 82, { align: 'center' });

  // Gold Ribbon Badge Stamp Simulation
  const badgeX = certW / 2;
  const badgeY = 118;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(1);
  doc.circle(badgeX, badgeY, 14, 'S');
  doc.circle(badgeX, badgeY, 11, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text('OFFICIAL', badgeX, badgeY - 3, { align: 'center' });
  doc.text('GOLD SEAL', badgeX, badgeY + 1.5, { align: 'center' });
  doc.text('★ ★ ★', badgeX, badgeY + 5.5, { align: 'center' });

  // Signatures
  const leftSigX = 50;
  const rightSigX = certW - 95;
  const sigY = certH - 35;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.line(leftSigX, sigY, leftSigX + 45, sigY);
  doc.line(rightSigX, sigY, rightSigX + 45, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('Chief Coloring Director', leftSigX + 22.5, sigY + 5, { align: 'center' });
  doc.text('Date of Achievement', rightSigX + 22.5, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('Keep on coloring and dreaming big!', certW / 2, certH - 18, { align: 'center' });
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

function drawCustomPageBorderPdf(
  doc: jsPDF,
  borderStyle: PageBorderStyle,
  x: number,
  y: number,
  w: number,
  h: number
) {
  doc.setDrawColor(20, 20, 20);

  if (borderStyle === 'none') {
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
    return;
  }

  if (borderStyle === 'classic-double') {
    // Outer bold line
    doc.setLineWidth(0.8);
    doc.rect(x, y, w, h);
    // Inner fine line
    doc.setLineWidth(0.3);
    doc.rect(x + 2, y + 2, w - 4, h - 4);
    // Corner accent squares
    doc.setFillColor(20, 20, 20);
    doc.rect(x + 1, y + 1, 2, 2, 'F');
    doc.rect(x + w - 3, y + 1, 2, 2, 'F');
    doc.rect(x + 1, y + h - 3, 2, 2, 'F');
    doc.rect(x + w - 3, y + h - 3, 2, 2, 'F');
    return;
  }

  if (borderStyle === 'stars-sparkles') {
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, w, h, 2, 2);
    // Inner dashed line
    doc.setLineWidth(0.25);
    doc.roundedRect(x + 1.8, y + 1.8, w - 3.6, h - 3.6, 1.5, 1.5);
    // Corner Star Glyphs
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text('★', x + 1, y + 3.5);
    doc.text('★', x + w - 4, y + 3.5);
    doc.text('★', x + 1, y + h - 1);
    doc.text('★', x + w - 4, y + h - 1);
    // Midpoint stars
    doc.setFontSize(8);
    doc.text('★', x + w / 2 - 1.5, y + 2);
    doc.text('★', x + w / 2 - 1.5, y + h - 0.5);
    return;
  }

  if (borderStyle === 'scalloped-dots') {
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, w, h, 3, 3);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + 1.8, y + 1.8, w - 3.6, h - 3.6, 2, 2);
    // Scallop dot corners
    doc.setFillColor(20, 20, 20);
    doc.circle(x + 3, y + 3, 1, 'F');
    doc.circle(x + w - 3, y + 3, 1, 'F');
    doc.circle(x + 3, y + h - 3, 1, 'F');
    doc.circle(x + w - 3, y + h - 3, 1, 'F');
    return;
  }

  if (borderStyle === 'jungle-vines') {
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, w, h, 2.5, 2.5);
    // Leaf corner loops
    doc.setLineWidth(0.4);
    doc.line(x, y + 6, x + 6, y);
    doc.line(x + w, y + 6, x + w - 6, y);
    doc.line(x, y + h - 6, x + 6, y + h);
    doc.line(x + w, y + h - 6, x + w - 6, y + h);
    doc.setFillColor(30, 30, 30);
    doc.circle(x + 3.5, y + 3.5, 0.8, 'F');
    doc.circle(x + w - 3.5, y + 3.5, 0.8, 'F');
    doc.circle(x + 3.5, y + h - 3.5, 0.8, 'F');
    doc.circle(x + w - 3.5, y + h - 3.5, 0.8, 'F');
    return;
  }

  if (borderStyle === 'space-constellation') {
    doc.setLineWidth(0.7);
    doc.rect(x, y, w, h);
    doc.setLineWidth(0.25);
    doc.rect(x + 2, y + 2, w - 4, h - 4);
    // Corner planet node
    doc.setFillColor(20, 20, 20);
    doc.circle(x + 2.5, y + 2.5, 1.2, 'F');
    doc.circle(x + w - 2.5, y + 2.5, 1.2, 'F');
    doc.circle(x + 2.5, y + h - 2.5, 1.2, 'F');
    doc.circle(x + w - 2.5, y + h - 2.5, 1.2, 'F');
    return;
  }

  if (borderStyle === 'hearts-ribbons') {
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, w, h, 2, 2);
    doc.setLineWidth(0.25);
    doc.roundedRect(x + 1.8, y + 1.8, w - 3.6, h - 3.6, 1.5, 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('♥', x + 1.2, y + 3);
    doc.text('♥', x + w - 3.8, y + 3);
    doc.text('♥', x + 1.2, y + h - 1.2);
    doc.text('♥', x + w - 3.8, y + h - 1.2);
    return;
  }

  if (borderStyle === 'zigzag-fun') {
    doc.setLineWidth(0.6);
    doc.rect(x, y, w, h);
    doc.setLineWidth(0.3);
    doc.rect(x + 2, y + 2, w - 4, h - 4);
    // Corner chevron accents
    doc.setLineWidth(0.5);
    doc.line(x + 1, y + 4, x + 4, y + 4);
    doc.line(x + 4, y + 4, x + 4, y + 1);
    doc.line(x + w - 1, y + 4, x + w - 4, y + 4);
    doc.line(x + w - 4, y + 4, x + w - 4, y + 1);
    doc.line(x + 1, y + h - 4, x + 4, y + h - 4);
    doc.line(x + 4, y + h - 4, x + 4, y + h - 1);
    doc.line(x + w - 1, y + h - 4, x + w - 4, y + h - 4);
    doc.line(x + w - 4, y + h - 4, x + w - 4, y + h - 1);
    return;
  }

  // Default fallback
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
}

/**
 * Draws a subtle, charming Crayon Swatch Guide strip along the bottom margin
 * for physical coloring printouts, matching page numberLegend or theme colors.
 */
function drawCrayonSwatchGuide(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  page: ColoringPage,
  theme: string
) {
  const guideH = 9.5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(x, y, w, guideH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  doc.text('🖍️ CRAYON PALETTE:', x + 3, y + 6);

  const defaultSwatches = [
    { name: 'SKY BLUE', hex: '#38bdf8' },
    { name: 'SUN YELLOW', hex: '#facc15' },
    { name: 'GRASS GREEN', hex: '#4ade80' },
    { name: 'CHERRY RED', hex: '#f87171' },
    { name: 'LAVENDER', hex: '#c084fc' },
  ];

  const palette =
    page.numberLegend && page.numberLegend.length > 0
      ? page.numberLegend.slice(0, 5).map((item) => ({
          name: item.colorName.toUpperCase(),
          hex: item.hex,
        }))
      : defaultSwatches;

  const startSwatchesX = x + 34;
  const availW = w - 36;
  const itemW = availW / palette.length;

  palette.forEach((swatch, idx) => {
    const itemX = startSwatchesX + idx * itemW;
    // Outer dashed circle for real crayon testing
    doc.setDrawColor(110, 110, 110);
    doc.setLineWidth(0.4);
    doc.circle(itemX + 2.5, y + 4.8, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(70, 70, 70);
    const shortName = swatch.name.length > 9 ? swatch.name.slice(0, 8) + '..' : swatch.name;
    doc.text(shortName, itemX + 5.5, y + 5.8);
  });
}

/**
 * Renders the "Draw Your Own Ending" bonus activity sheet.
 */
function drawDrawYourOwnEndingPage(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  book: ColoringBook
) {
  doc.addPage();

  // Outer Decorative Border
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.2);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3);
  drawCornerDeco(doc, 18, 18);
  drawCornerDeco(doc, pageWidth - 18, 18);
  drawCornerDeco(doc, 18, pageHeight - 18);
  drawCornerDeco(doc, pageWidth - 18, pageHeight - 18);

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text('⭐ BONUS: DRAW YOUR OWN ENDING! ⭐', pageWidth / 2, 23, { align: 'center' });

  // Story Prompt
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const promptText = `What happens next in ${book.childName}'s ${book.theme} adventure? Draw your very own surprise ending in the canvas below!`;
  const promptLines = doc.splitTextToSize(promptText, pageWidth - 36);
  doc.text(promptLines, pageWidth / 2, 29, { align: 'center' });

  // Drawing Frame
  const frameX = 18;
  const frameY = 34;
  const frameW = pageWidth - 36;
  const frameH = pageHeight - 108;

  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.8);
  doc.rect(frameX, frameY, frameW, frameH);
  drawCustomPageBorderPdf(doc, book.defaultBorderStyle || 'stars-sparkles', frameX, frameY, frameW, frameH);

  // Light watermark inside drawing frame
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(215, 215, 215);
  doc.text('✏️ DRAW YOUR ADVENTURE ENDING HERE ✏️', pageWidth / 2, frameY + frameH / 2 - 3, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('Use crayons, markers, or colored pencils to bring your ideas to life!', pageWidth / 2, frameY + frameH / 2 + 3, { align: 'center' });

  // Story Lines for Child's Handwriting
  const linesStartY = frameY + frameH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text('MY STORY ENDING:', 18, linesStartY);

  // 3 ruled lines
  for (let i = 0; i < 3; i++) {
    const lineY = linesStartY + 6 + i * 6.5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(18, lineY, pageWidth - 18, lineY);
  }

  // Footer / Author Credit
  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(`★ Written & Illustrated by Master Artist ${book.childName} • The End ★`, pageWidth / 2, footerY, { align: 'center' });
}

/**
 * Draws a printable Themed Maze Page with Start/Finish and solving prompt
 */
function drawThemedMazePdfPage(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  book: ColoringBook
) {
  doc.addPage();

  // Outer Border
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.2);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3);
  drawCornerDeco(doc, 18, 18);
  drawCornerDeco(doc, pageWidth - 18, 18);
  drawCornerDeco(doc, 18, pageHeight - 18);
  drawCornerDeco(doc, pageWidth - 18, pageHeight - 18);

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text(`★ BONUS: ${book.childName.toUpperCase()}'S ${book.theme.toUpperCase()} MAZE ★`, pageWidth / 2, 23, { align: 'center' });

  // Prompt
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Help the explorer navigate through the ${book.theme} maze to the finish without crossing any black walls!`,
    pageWidth / 2,
    29,
    { align: 'center' }
  );

  // Maze Frame
  const mazeSize = Math.min(pageWidth - 50, pageHeight - 80);
  const mazeX = (pageWidth - mazeSize) / 2;
  const mazeY = 36;

  // Generate 10x10 maze
  const maze = generateMaze(10, 10);
  const cellW = mazeSize / maze.cols;
  const cellH = mazeSize / maze.rows;

  // Draw Start & Finish Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text(`START (START HERE!)`, mazeX + cellW / 2, mazeY - 3, { align: 'center' });

  doc.setTextColor(239, 68, 68);
  doc.text(`FINISH!`, mazeX + (maze.cols - 0.5) * cellW, mazeY + mazeSize + 5, { align: 'center' });

  // Draw maze walls
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.9);

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cell = maze.cells[r][c];
      const cx = mazeX + c * cellW;
      const cy = mazeY + r * cellH;

      if (cell.top) {
        doc.line(cx, cy, cx + cellW, cy);
      }
      if (cell.right) {
        doc.line(cx + cellW, cy, cx + cellW, cy + cellH);
      }
      if (cell.bottom) {
        doc.line(cx, cy + cellH, cx + cellW, cy + cellH);
      }
      if (cell.left) {
        doc.line(cx, cy, cx, cy + cellH);
      }
    }
  }

  // Footer
  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(`★ Made for ${book.childName} • Maze Adventure • ColorCraft Kids ★`, pageWidth / 2, footerY, { align: 'center' });
}

/**
 * Draws printable DIY Bookmarks and Bedroom Door Hanger with dashed cut lines
 */
function drawCutOutCraftsPdfPage(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  book: ColoringBook
) {
  doc.addPage();

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`✂️ BONUS: ${book.childName.toUpperCase()}'S DIY BOOKMARKS & DOOR HANGER ✂️`, pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Color in the designs, then have an adult help cut along the dashed lines (✂) with safety scissors!`,
    pageWidth / 2,
    26,
    { align: 'center' }
  );

  const startY = 34;
  const colWidth = (pageWidth - 36) / 3;

  // Cut-out dashed line mode
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([2, 2], 0);

  // 1. Bookmark 1: Personalized Adventure Bookmark
  const bm1X = 18;
  const bm1H = pageHeight - 65;
  doc.roundedRect(bm1X, startY, colWidth - 4, bm1H, 2, 2);

  // 2. Bookmark 2: Master Artist Bookmark
  const bm2X = 18 + colWidth;
  doc.roundedRect(bm2X, startY, colWidth - 4, bm1H, 2, 2);

  // 3. Door Hanger
  const dhX = 18 + colWidth * 2;
  doc.roundedRect(dhX, startY, colWidth - 4, bm1H, 6, 6);
  // Door knob circular hole
  doc.circle(dhX + (colWidth - 4) / 2, startY + 22, 10, 'S');

  // Reset line dash
  doc.setLineDashPattern([], 0);

  // Inner Artwork & Text for Bookmark 1
  const bm1MidX = bm1X + (colWidth - 4) / 2;
  doc.circle(bm1MidX, startY + 8, 2.5, 'S'); // Ribbon punch hole

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(`★ ${book.childName.toUpperCase()}'S ★`, bm1MidX, startY + 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text('READING ADVENTURE', bm1MidX, startY + 26, { align: 'center' });

  // Patterns to color
  doc.setLineWidth(0.4);
  doc.rect(bm1X + 4, startY + 36, colWidth - 12, 35);
  doc.setFontSize(14);
  doc.text('🚀  ⭐  🪐', bm1MidX, startY + 56, { align: 'center' });

  doc.rect(bm1X + 4, startY + 78, colWidth - 12, 35);
  doc.text('🦖  🌿  🦕', bm1MidX, startY + 98, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('"I Love Reading!"', bm1MidX, startY + bm1H - 12, { align: 'center' });

  // Inner Artwork & Text for Bookmark 2
  const bm2MidX = bm2X + (colWidth - 4) / 2;
  doc.circle(bm2MidX, startY + 8, 2.5, 'S'); // Ribbon punch hole

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('COLORING CHAMPION', bm2MidX, startY + 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text('OFFICIAL BOOKMARK', bm2MidX, startY + 26, { align: 'center' });

  doc.setLineWidth(0.4);
  doc.rect(bm2X + 4, startY + 36, colWidth - 12, 80);
  doc.setFontSize(16);
  doc.text('🎨  ✨  🖍️', bm2MidX, startY + 70, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Master Artist', bm2MidX, startY + 84, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('★ ★ ★ ★ ★', bm2MidX, startY + 94, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Page Marker', bm2MidX, startY + bm1H - 12, { align: 'center' });

  // Inner Artwork & Text for Door Hanger
  const dhMidX = dhX + (colWidth - 4) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('SHHH!', dhMidX, startY + 44, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(`${book.childName.toUpperCase()} IS`, dhMidX, startY + 52, { align: 'center' });
  doc.text('BUSY COLORING!', dhMidX, startY + 58, { align: 'center' });

  doc.setFontSize(18);
  doc.text('🖍️  🎨  ✨', dhMidX, startY + 85, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Artists at Work', dhMidX, startY + bm1H - 12, { align: 'center' });

  // Cut labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('✂ CUT BOOKMARK 1', bm1MidX, startY - 2, { align: 'center' });
  doc.text('✂ CUT BOOKMARK 2', bm2MidX, startY - 2, { align: 'center' });
  doc.text('✂ CUT DOOR HANGER', dhMidX, startY - 2, { align: 'center' });

  // Footer
  const footerY = pageHeight - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`★ ${book.childName}'s DIY Crafts • Printable Cut-Out Sheet • ColorCraft Kids ★`, pageWidth / 2, footerY, { align: 'center' });
}

/**
 * Draws the vertical folding / stapling guide in the exact center of a landscape booklet sheet.
 */
function drawBookletCenterFoldGuide(doc: jsPDF, sheetWidth: number, sheetHeight: number) {
  const midX = sheetWidth / 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2.5], 0);
  doc.line(midX, 9, midX, sheetHeight - 9);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('✁ FOLD / STAPLE HERE ✁', midX, 6.5, { align: 'center' });
  doc.text('✁ FOLD / STAPLE HERE ✁', midX, sheetHeight - 4, { align: 'center' });
}

/**
 * Generates a 2-Up foldable mini-booklet PDF formatted for standard letter/A4 landscape paper.
 */
async function generateBookletPdf(
  book: ColoringBook,
  options: GeneratePdfOptions,
  qrCodeDataUrl: string | null
): Promise<jsPDF> {
  const {
    paperSize = 'letter',
    includeCover = true,
    includeDedicationPage = true,
    includeCertificate = true,
    includeStickers = true,
    includeCaptions = true,
    includeDrawYourEnding = true,
    includeCrayonSwatches = true,
    onProgress,
  } = options;

  const isA4 = paperSize === 'a4';
  const sheetWidth = isA4 ? 297 : 279.4;
  const sheetHeight = isA4 ? 210 : 215.9;
  const halfWidth = sheetWidth / 2;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: paperSize,
    compress: true,
  });

  onProgress?.(15, `Compiling foldable mini-booklet layout for ${book.childName}...`);

  // Render a coloring page in half-sheet slot
  const renderHalfColoringPage = async (
    page: ColoringPage,
    originX: number,
    pageNum: number,
    totalPages: number
  ) => {
    // Outer border
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.roundedRect(originX + 8, 8, halfWidth - 16, sheetHeight - 16, 2.5, 2.5);

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    const titleLines = doc.splitTextToSize(`Page ${pageNum}: ${page.title}`, halfWidth - 22);
    doc.text(titleLines, originX + halfWidth / 2, 16, { align: 'center' });

    // Image Box
    const imgBoxY = 21;
    const maxW = halfWidth - 24;
    const maxH = sheetHeight - 68;
    let imgW = maxW;
    let imgH = imgW * (4 / 3);
    if (imgH > maxH) {
      imgH = maxH;
      imgW = imgH * (3 / 4);
    }
    const imgX = originX + (halfWidth - imgW) / 2;

    const effectiveImgUrl = page.coloredImageUrl || page.imageUrl;
    const rasterPageImg = await prepareRasterPng(effectiveImgUrl);
    const pageBorder = page.borderStyle || book.defaultBorderStyle || 'classic-double';

    if (rasterPageImg) {
      try {
        doc.addImage(rasterPageImg, 'PNG', imgX + 0.5, imgBoxY + 0.5, imgW - 1, imgH - 1);
        drawCustomPageBorderPdf(doc, pageBorder, imgX, imgBoxY, imgW, imgH);
      } catch (e) {
        drawPageIllustrationFallback(doc, imgX, imgBoxY, imgW, imgH, page);
        drawCustomPageBorderPdf(doc, pageBorder, imgX, imgBoxY, imgW, imgH);
      }
    } else {
      drawPageIllustrationFallback(doc, imgX, imgBoxY, imgW, imgH, page);
      drawCustomPageBorderPdf(doc, pageBorder, imgX, imgBoxY, imgW, imgH);
    }

    let nextY = imgBoxY + imgH + 3.5;

    // Caption
    if (includeCaptions && page.storyCaption) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const capLines = doc.splitTextToSize(`"${page.storyCaption}"`, halfWidth - 24);
      doc.text(capLines.slice(0, 2), originX + halfWidth / 2, nextY, { align: 'center' });
      nextY += capLines.slice(0, 2).length * 3.4 + 1;
    }

    // Crayon Swatches in mini-booklet
    if (includeCrayonSwatches) {
      const guideW = halfWidth - 26;
      const guideX = originX + 13;
      const guideY = sheetHeight - 21;
      drawCrayonSwatchGuide(doc, guideX, guideY, guideW, page, book.theme);
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`★ Page ${pageNum} of ${totalPages} • ${book.childName}'s Mini Book ★`, originX + halfWidth / 2, sheetHeight - 10, { align: 'center' });
  };

  // ----------------------------------------------------
  // BOOKLET SHEET 1: Dedication (Left) & Cover (Right)
  // ----------------------------------------------------
  drawBookletCenterFoldGuide(doc, sheetWidth, sheetHeight);

  // Left: Dedication
  if (includeDedicationPage) {
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.roundedRect(8, 8, halfWidth - 16, sheetHeight - 16, 2.5, 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('DEDICATION & COLOR TESTER', halfWidth / 2, 20, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const author = book.dedicationAuthor ? `From: ${book.dedicationAuthor}` : 'Dedicated with love';
    doc.text(`★ ${author} ★`, halfWidth / 2, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const dedText = book.dedication || `May your world always be full of bright colors!`;
    const dedLines = doc.splitTextToSize(`"${dedText}"`, halfWidth - 30);
    doc.text(dedLines, halfWidth / 2, 35, { align: 'center' });

    // Swatch Testing Circles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text('🎨 COLOR TESTING PALETTE 🎨', halfWidth / 2, 60, { align: 'center' });

    for (let i = 0; i < 5; i++) {
      const cx = 22 + i * 22;
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.circle(cx, 75, 7, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(`${i + 1}`, cx, 77.5, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Test your crayons here before coloring the pages!', halfWidth / 2, 92, { align: 'center' });
  }

  // Right: Cover
  if (includeCover) {
    const originX = halfWidth;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(1.2);
    doc.roundedRect(originX + 8, 8, halfWidth - 16, sheetHeight - 16, 2.5, 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    const titleLines = doc.splitTextToSize(book.title || `${book.childName}'s Adventure`, halfWidth - 24);
    doc.text(titleLines, originX + halfWidth / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(book.subtitle || 'A special mini coloring journey', originX + halfWidth / 2, 30, { align: 'center' });

    // Cover Image
    const coverBoxSize = Math.min(halfWidth - 36, 95);
    const coverBoxX = originX + (halfWidth - coverBoxSize) / 2;
    const coverBoxY = 36;

    const rawCover =
      book.coverImageUrl ||
      createThematicCoverSvg(book.theme, book.childName, book.difficulty || 'standard');
    const rasterCover = await prepareRasterPng(rawCover);
    if (rasterCover) {
      try {
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(0.8);
        doc.rect(coverBoxX, coverBoxY, coverBoxSize, coverBoxSize);
        doc.addImage(rasterCover, 'PNG', coverBoxX + 0.5, coverBoxY + 0.5, coverBoxSize - 1, coverBoxSize - 1);
      } catch (e) {
        drawCoverPlaceholder(doc, coverBoxX, coverBoxY, coverBoxSize, book);
      }
    } else {
      drawCoverPlaceholder(doc, coverBoxX, coverBoxY, coverBoxSize, book);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`★ ARTIST: ${(book.childName || 'LITTLE ARTIST').toUpperCase()} ★`, originX + halfWidth / 2, sheetHeight - 18, { align: 'center' });

    if (book.brandIntegration?.enabled && book.brandIntegration.showOnCover) {
      const brandInfo = book.brandIntegration;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const displayUrl = brandInfo.websiteUrl ? ` • ${brandInfo.websiteUrl.replace(/^https?:\/\//, '')}` : '';
      const sponsorText = `${brandInfo.tagline || 'Presented by'}: ${brandInfo.organizationName}${displayUrl}`;
      doc.text(sponsorText, originX + halfWidth / 2, sheetHeight - 12, { align: 'center' });
    }
  }

  // ----------------------------------------------------
  // STORY PAGES (2-UP per landscape sheet)
  // ----------------------------------------------------
  const totalPages = book.pages.length;
  for (let i = 0; i < totalPages; i += 2) {
    doc.addPage();
    drawBookletCenterFoldGuide(doc, sheetWidth, sheetHeight);

    // Left Page (i)
    if (i < totalPages) {
      await renderHalfColoringPage(book.pages[i], 0, i + 1, totalPages);
    }

    // Right Page (i + 1)
    if (i + 1 < totalPages) {
      await renderHalfColoringPage(book.pages[i + 1], halfWidth, i + 2, totalPages);
    }
  }

  // ----------------------------------------------------
  // FINAL SHEET: Draw Your Own Ending & Certificate
  // ----------------------------------------------------
  if (includeDrawYourEnding || includeCertificate) {
    doc.addPage();
    drawBookletCenterFoldGuide(doc, sheetWidth, sheetHeight);

    // Left: Draw Your Own Ending
    if (includeDrawYourEnding) {
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.8);
      doc.roundedRect(8, 8, halfWidth - 16, sheetHeight - 16, 2.5, 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text('⭐ DRAW YOUR OWN ENDING! ⭐', halfWidth / 2, 17, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(`What happens next for ${book.childName}? Draw your scene below!`, halfWidth / 2, 23, { align: 'center' });

      // Frame
      const frameX = 14;
      const frameY = 27;
      const frameW = halfWidth - 28;
      const frameH = sheetHeight - 78;
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.6);
      doc.rect(frameX, frameY, frameW, frameH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text('✏️ DRAW YOUR ORIGINAL ENDING HERE ✏️', halfWidth / 2, frameY + frameH / 2, { align: 'center' });

      // Story Lines
      const lineY = frameY + frameH + 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      doc.text('MY STORY ENDING:', 14, lineY);
      for (let l = 0; l < 2; l++) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(14, lineY + 5 + l * 5.5, halfWidth - 14, lineY + 5 + l * 5.5);
      }
    }

    // Right: Certificate
    if (includeCertificate) {
      const originX = halfWidth;
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(1);
      doc.roundedRect(originX + 8, 8, halfWidth - 16, sheetHeight - 16, 2.5, 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('COLORING MASTER CERTIFICATE', originX + halfWidth / 2, 22, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text('THIS PROUDLY CERTIFIES THAT', originX + halfWidth / 2, 30, { align: 'center' });

      // Name Box
      doc.setDrawColor(50, 50, 50);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(originX + 20, 36, halfWidth - 40, 18, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(book.childName || 'Little Artist', originX + halfWidth / 2, 48, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Has successfully completed the entire ${book.theme} coloring adventure!`, originX + halfWidth / 2, 62, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('🏆', originX + halfWidth / 2, 85, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Master Artist Award • Verified with Pride', originX + halfWidth / 2, 98, { align: 'center' });
    }
  }

  onProgress?.(100, 'Foldable mini-booklet ready!');
  return doc;
}

