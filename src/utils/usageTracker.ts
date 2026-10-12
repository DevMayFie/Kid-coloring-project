/**
 * Client-side usage tracking helper.
 * Sends asynchronous logging beacons to /api/logs/pdf-export and /api/logs/regeneration.
 * Fails silently if offline or network error occurs, ensuring zero UI disruption.
 */

export type ClientPdfExportType = 'full-book' | 'single-page' | 'direct-print';
export type ClientRegenType = 'page' | 'cover' | 'stickers' | 'batch';

export async function trackPdfExport(
  exportType: ClientPdfExportType = 'full-book',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const payload = JSON.stringify({ exportType, metadata });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/logs/pdf-export', blob);
      return;
    }

    if (typeof fetch !== 'undefined') {
      fetch('/api/logs/pdf-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // silent fallback
      });
    }
  } catch {
    // silent fallback
  }
}

export async function trackRegeneration(
  regenType: ClientRegenType = 'page',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const payload = JSON.stringify({ regenType, metadata });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/logs/regeneration', blob);
      return;
    }

    if (typeof fetch !== 'undefined') {
      fetch('/api/logs/regeneration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // silent fallback
      });
    }
  } catch {
    // silent fallback
  }
}
