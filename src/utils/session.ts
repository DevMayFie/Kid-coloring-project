/**
 * Client-side anonymous session identifier helper.
 * Provides a persistent unique session ID stored in localStorage,
 * allowing the server to enforce anonymous-session and user quotas on AI endpoints.
 * Integrates with server-issued, cryptographically signed anonymous session tokens.
 */

const SESSION_KEY = 'colorcraft_anonymous_session_v1';
let syncPromise: Promise<string> | null = null;

export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-render-session';
  }

  try {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId && sessionId.length >= 10) {
      return sessionId;
    }
  } catch {
    // ignore localStorage exceptions
  }

  // Temporary fallback until server handshake resolves
  const fallback = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  try {
    localStorage.setItem(SESSION_KEY, fallback);
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Initializes or refreshes the server-issued, signed anonymous session token.
 * Prevents arbitrary client ID forgery and binds rate limits securely.
 * Safely clears syncPromise on handshake failures so subsequent requests can retry.
 * Prevents duplicate concurrent handshakes by sharing in-flight promise.
 */
export async function initServerSession(): Promise<string> {
  if (typeof window === 'undefined') return 'server-render-session';

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const current = localStorage.getItem(SESSION_KEY);
      const res = await fetch('/api/session', {
        method: 'GET',
        headers: current ? { 'X-Session-ID': current } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.sessionId) {
          localStorage.setItem(SESSION_KEY, data.sessionId);
          return data.sessionId;
        }
      }
      // If server responded with an error, clear syncPromise so later calls can retry
      syncPromise = null;
    } catch (err) {
      console.warn('Could not complete server session handshake:', err);
      // If network fetch threw, clear syncPromise so later calls can retry
      syncPromise = null;
    }
    return getClientSessionId();
  })();

  return syncPromise;
}

/**
 * Resets the in-flight session sync promise (for unit tests and explicit reset).
 */
export function resetSessionSyncForTesting(): void {
  syncPromise = null;
}

export function getSyncPromiseForTesting(): Promise<string> | null {
  return syncPromise;
}

