/**
 * Client-side anonymous session identifier helper.
 * Provides a persistent unique session ID stored in localStorage,
 * allowing the server to enforce anonymous-session and user quotas on AI endpoints.
 */

const SESSION_KEY = 'colorcraft_anonymous_session_v1';

export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-render-session';
  }

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId || sessionId.length < 10) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `sess_fallback_${Date.now()}`;
  }
}
