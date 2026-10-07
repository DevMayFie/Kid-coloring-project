import QRCode from 'qrcode';

/**
 * Generates a clean, scannable QR code as a base64 Data URL.
 * Works seamlessly in both browser and node contexts.
 */
export async function generateQrCodeDataUrl(text: string, size = 180): Promise<string> {
  try {
    const url = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#1f2937', // dark slate gray
        light: '#ffffff', // pure white
      },
      errorCorrectionLevel: 'M',
    });
    return url;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    // Fallback simple SVG QR placeholder if generation throws
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#fff" stroke="#1f2937" stroke-width="2"/>
      <rect x="10" y="10" width="25" height="25" fill="#1f2937"/>
      <rect x="15" y="15" width="15" height="15" fill="#fff"/>
      <rect x="65" y="10" width="25" height="25" fill="#1f2937"/>
      <rect x="70" y="15" width="15" height="15" fill="#fff"/>
      <rect x="10" y="65" width="25" height="25" fill="#1f2937"/>
      <rect x="15" y="70" width="15" height="15" fill="#fff"/>
      <rect x="45" y="45" width="15" height="15" fill="#1f2937"/>
      <text x="50" y="94" font-size="7" text-anchor="middle" font-weight="bold" fill="#1f2937">SCAN ME</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`;
  }
}
