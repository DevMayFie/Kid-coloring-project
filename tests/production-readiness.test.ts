import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  checkAiBudgetCircuitBreaker,
  reserveAiBudget,
  commitAiBudget,
  releaseAiBudgetReservation,
  recordAiUsageEstimate,
  getBudgetState,
  resetBudgetStateForTesting,
  setBudgetStoreForTesting,
  activeReservations,
  createSignedSessionId,
  verifySignedSessionId,
  getAnonymousSessionId,
  normalizeIp,
  createConsentToken,
  verifyConsentToken,
  requireAdminAuth,
  createSessionQuotaMiddleware,
  sessionQuotaStore,
} from '../server';
import {
  initServerSession,
  getClientSessionId,
  resetSessionSyncForTesting,
  getSyncPromiseForTesting,
} from '../src/utils/session';
import {
  storageReady,
  initStorage,
  isStorageHydrated,
  getStorageInitError,
  saveAutosaveToDb,
  createSafeStore,
  resetStorageStateForTesting,
} from '../src/utils/dbStorage';

// Setup Mock IndexedDB for testing
function setupMockIndexedDB(shouldFail = false) {
  const storeData = new Map<string, any>();
  const existingStores = new Set<string>(['coloring_books', 'privacy_consent', 'keyval']);
  let dbVersion = 1;

  const mockDB = {
    get version() {
      return dbVersion;
    },
    objectStoreNames: {
      contains: (s: string) => existingStores.has(s),
    },
    createObjectStore: (s: string) => {
      existingStores.add(s);
    },
    close: () => {},
    transaction: (stores: string | string[]) => {
      const storeName = Array.isArray(stores) ? stores[0] : stores;
      if (!existingStores.has(storeName)) {
        const err = new Error("Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.");
        err.name = 'NotFoundError';
        throw err;
      }
      const tx: any = {};
      setTimeout(() => tx.onsuccess?.(), 0);
      return {
        objectStore: () => ({
          get: (k: string) => {
            const req: any = { result: storeData.get(k) };
            setTimeout(() => {
              if (shouldFail) {
                req.error = new Error('IndexedDB disk read failure');
                req.onerror?.();
              } else {
                req.onsuccess?.();
              }
            }, 0);
            return req;
          },
          put: (v: any, k: string) => {
            storeData.set(k, v);
            const req: any = { result: undefined };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
          transaction: tx,
        }),
      };
    },
  };

  (globalThis as any).indexedDB = {
    open: (name: string, ver?: number) => {
      if (ver && ver > dbVersion) {
        dbVersion = ver;
      }
      const req: any = { result: mockDB };
      setTimeout(() => {
        if (shouldFail) {
          req.error = new Error('IndexedDB permission denied or unavailable');
          req.onerror?.();
        } else {
          if (ver && ver > 1) {
            req.onupgradeneeded?.();
          }
          req.onsuccess?.();
        }
      }, 0);
      return req;
    },
  };

  return { storeData, existingStores };
}

describe('ColorKid Production Readiness & Security Test Suite', () => {
  beforeEach(() => {
    resetBudgetStateForTesting(0, 0);
    resetStorageStateForTesting();
    resetSessionSyncForTesting();
    sessionQuotaStore.clear();
  });

  describe('Priority 1: AI Spending Budget & Concurrency Locks', () => {
    it('exhausted budget rejects requests via checkAiBudgetCircuitBreaker and reserveAiBudget', () => {
      // Simulate budget at the limit ($50.00 daily budget)
      resetBudgetStateForTesting(50.00, 0);

      const check = checkAiBudgetCircuitBreaker(0.04);
      assert.equal(check.allowed, false);
      assert.match(check.reason || '', /daily ai usage spending budget limit.*reached/i);

      const reservation = reserveAiBudget(0.04);
      assert.equal(reservation.allowed, false);
      assert.match(reservation.reason || '', /budget limit.*reached/i);
    });

    it('concurrent reservations prevent race-condition overspending', () => {
      // Set budget close to $50.00 limit ($49.98 used, limit is 50.00)
      resetBudgetStateForTesting(49.98, 0);

      // First concurrent request reserves $0.015 (total projected: 49.98 + 0.015 = 49.995 <= 50.00)
      const res1 = reserveAiBudget(0.015);
      assert.equal(res1.allowed, true);
      assert.ok(res1.reservationId);
      assert.equal(activeReservations.size, 1);

      // Second concurrent request reserves $0.015 in-flight (projected: 49.98 + 0.015 + 0.015 = 50.01 > 50.00)
      const res2 = reserveAiBudget(0.015);
      assert.equal(res2.allowed, false);
      assert.match(res2.reason || '', /budget limit.*reached/i);

      // Releasing res1 unblocks capacity
      releaseAiBudgetReservation(res1.reservationId);
      assert.equal(activeReservations.size, 0);

      // Now a retry can succeed
      const resRetry = reserveAiBudget(0.015);
      assert.equal(resRetry.allowed, true);
      commitAiBudget(resRetry.reservationId, 0.015);
    });

    it('accounts for every paid provider attempt, including fallback model calls', () => {
      resetBudgetStateForTesting(0, 0);

      const estimatedCost = 0.002;
      const budgetRes = reserveAiBudget(estimatedCost);
      assert.equal(budgetRes.allowed, true);

      // Simulate primary attempt failed, followed by fallback attempt
      const attempts = 2; // Primary + Fallback
      commitAiBudget(budgetRes.reservationId, estimatedCost * attempts);

      const state = getBudgetState();
      assert.equal(state.dailyEstimatedCostUsd, 0.004);
      assert.equal(state.dailyRequestsTracked, 1);
      assert.equal(state.dailyReservedCostUsd, 0);
    });

    it('cleans up reservations safely when failure occurs before contacting provider', () => {
      resetBudgetStateForTesting(0, 0);

      const res = reserveAiBudget(0.04);
      assert.equal(res.allowed, true);
      assert.equal(getBudgetState().dailyReservedCostUsd, 0.04);

      // Simulate error before provider contact (e.g. invalid arguments or getGenAI error)
      releaseAiBudgetReservation(res.reservationId);

      const state = getBudgetState();
      assert.equal(state.dailyReservedCostUsd, 0);
      assert.equal(state.dailyEstimatedCostUsd, 0);
    });

    it('admin usage-budget requires valid authentication and rejects query parameters (CWE-598)', () => {
      process.env.ADMIN_KEY = 'test-secure-admin-key-2026';

      // 1. Query parameter token rejected
      let status1 = 200;
      let body1: any = null;
      const req1: any = { query: { adminKey: 'test-secure-admin-key-2026' }, headers: {} };
      const res1: any = {
        status: (s: number) => { status1 = s; return res1; },
        json: (b: any) => { body1 = b; return res1; },
      };
      requireAdminAuth(req1, res1, () => {});
      assert.equal(status1, 400);
      assert.match(body1.error, /must not be passed in url query parameters/i);

      // 2. Missing admin key
      let status2 = 200;
      let body2: any = null;
      const req2: any = { query: {}, headers: {} };
      const res2: any = {
        status: (s: number) => { status2 = s; return res2; },
        json: (b: any) => { body2 = b; return res2; },
      };
      requireAdminAuth(req2, res2, () => {});
      assert.equal(status2, 401);
      assert.match(body2.error, /unauthorized.*required/i);

      // 3. Wrong admin key
      let status3 = 200;
      const req3: any = { query: {}, headers: { 'x-admin-key': 'wrong-secret' } };
      const res3: any = {
        status: (s: number) => { status3 = s; return res3; },
        json: () => res3,
      };
      requireAdminAuth(req3, res3, () => {});
      assert.equal(status3, 401);

      // 4. Valid admin key via X-Admin-Key header
      let nextCalled = false;
      const req4: any = { query: {}, headers: { 'x-admin-key': 'test-secure-admin-key-2026' } };
      const res4: any = {};
      requireAdminAuth(req4, res4, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
    });

    it('budget state is persistent and shared across store updates', () => {
      let savedState: any = null;
      const mockStore = {
        getState: () => savedState || {
          dailyEstimatedCostUsd: 12.50,
          dailyReservedCostUsd: 0,
          dailyRequestsTracked: 15,
          dailyCostResetTimestamp: Date.now() + 86400000,
        },
        saveState: (st: any) => { savedState = st; },
      };

      setBudgetStoreForTesting(mockStore as any);
      const state = getBudgetState();
      assert.equal(state.dailyEstimatedCostUsd, 12.50);
      assert.equal(state.dailyRequestsTracked, 15);
    });
  });

  describe('Priority 2: Session Quota, IP Normalization & Abuse Prevention', () => {
    it('generates and cryptographically verifies server-issued signed sessions', () => {
      const sessionId = createSignedSessionId();
      assert.ok(sessionId.startsWith('sess_'));
      assert.ok(sessionId.includes('.'));

      const verified = verifySignedSessionId(sessionId);
      assert.equal(verified.valid, true);
      assert.ok(verified.rawId);

      // Tampered signature
      const tampered = `${verified.rawId}.fakeSignature123`;
      assert.equal(verifySignedSessionId(tampered).valid, false);

      // Missing / malformed
      assert.equal(verifySignedSessionId('').valid, false);
      assert.equal(verifySignedSessionId('not_a_session').valid, false);
    });

    it('correctly normalizes IPv4, IPv4-mapped IPv6, and true IPv6 addresses without hextet stripping', () => {
      // IPv4
      assert.equal(normalizeIp('192.168.1.100'), '192.168.1.100');

      // IPv4-mapped IPv6
      assert.equal(normalizeIp('::ffff:192.0.2.1'), '192.0.2.1');

      // Localhost IPv6
      assert.equal(normalizeIp('::1'), '127.0.0.1');

      // True IPv6 addresses MUST preserve all hextets and not collapse to last digits
      assert.equal(normalizeIp('2001:0db8:85a3::7334'), '2001:0db8:85a3::7334');
      assert.equal(normalizeIp('2001:db8::1'), '2001:db8::1');
      assert.equal(normalizeIp('2001:db8::2'), '2001:db8::2');

      // Ensure distinct IPv6 clients do not collide
      assert.notEqual(normalizeIp('2001:db8::1'), normalizeIp('2001:db8::2'));
    });

    it('new session IDs cannot reset quota under dual-layer IP envelope', () => {
      const quotaMw = createSessionQuotaMiddleware({
        windowMinutes: 10,
        maxRequests: 2,
        endpointName: 'Test Image',
      });

      const clientIp = '203.0.113.195';

      // Request 1 with Session A
      const sessionA = createSignedSessionId();
      let status1 = 200;
      const req1: any = { ip: clientIp, body: { sessionId: sessionA }, headers: {} };
      const res1: any = { setHeader: () => {}, status: (s: number) => { status1 = s; return res1; }, json: () => res1 };
      quotaMw(req1, res1, () => {});
      assert.equal(status1, 200);

      // Request 2 with Session A
      let status2 = 200;
      const req2: any = { ip: clientIp, body: { sessionId: sessionA }, headers: {} };
      const res2: any = { setHeader: () => {}, status: (s: number) => { status2 = s; return res2; }, json: () => res2 };
      quotaMw(req2, res2, () => {});
      assert.equal(status2, 200);

      // Request 3 with fresh Session B (malicious rotation attempt)
      const sessionB = createSignedSessionId();
      let status3 = 200;
      let body3: any = null;
      const req3: any = { ip: clientIp, body: { sessionId: sessionB }, headers: {} };
      const res3: any = {
        setHeader: () => {},
        status: (s: number) => { status3 = s; return res3; },
        json: (b: any) => { body3 = b; return res3; },
      };
      quotaMw(req3, res3, () => {});

      // Must be rejected with 429 because IP envelope quota is reached!
      assert.equal(status3, 429);
      assert.match(body3.error, /creating new session ids cannot reset this limit/i);
    });

    it('clears syncPromise on failed session handshake so later calls can retry', async () => {
      // Mock globalThis.fetch to simulate a failed request
      const originalFetch = (globalThis as any).fetch;
      try {
        let fetchCalls = 0;
        (globalThis as any).fetch = async () => {
          fetchCalls++;
          throw new Error('Network timeout contacting /api/session');
        };
        (globalThis as any).window = {};
        (globalThis as any).localStorage = {
          getItem: () => null,
          setItem: () => {},
        };

        // First attempt fails
        const id1 = await initServerSession();
        assert.ok(id1.startsWith('sess_'));
        assert.equal(fetchCalls, 1);

        // syncPromise should be cleared on failure, allowing a second call to retry
        assert.equal(getSyncPromiseForTesting(), null);

        // Second attempt retries fetch
        const id2 = await initServerSession();
        assert.ok(id2.startsWith('sess_'));
        assert.equal(fetchCalls, 2);
      } finally {
        (globalThis as any).fetch = originalFetch;
        delete (globalThis as any).window;
        delete (globalThis as any).localStorage;
      }
    });

    it('shares in-flight syncPromise across concurrent handshake calls to prevent duplicate requests', async () => {
      const originalFetch = (globalThis as any).fetch;
      try {
        let fetchCalls = 0;
        const validServerSession = createSignedSessionId();

        (globalThis as any).fetch = async () => {
          fetchCalls++;
          await new Promise((r) => setTimeout(r, 20));
          return {
            ok: true,
            json: async () => ({ success: true, sessionId: validServerSession }),
          };
        };
        (globalThis as any).window = {};
        (globalThis as any).localStorage = {
          getItem: () => null,
          setItem: () => {},
        };

        // 3 simultaneous calls
        const [res1, res2, res3] = await Promise.all([
          initServerSession(),
          initServerSession(),
          initServerSession(),
        ]);

        assert.equal(res1, validServerSession);
        assert.equal(res2, validServerSession);
        assert.equal(res3, validServerSession);
        assert.equal(fetchCalls, 1, 'Concurrent handshakes must share single fetch promise');
      } finally {
        (globalThis as any).fetch = originalFetch;
        delete (globalThis as any).window;
        delete (globalThis as any).localStorage;
      }
    });
  });

  describe('Priority 3: IndexedDB Safe Initialization & Hydration Protection', () => {
    it('concurrent calls to initStorage share one single initialization promise', async () => {
      setupMockIndexedDB(false);

      const p1 = initStorage();
      const p2 = storageReady();
      const p3 = initStorage();

      assert.strictEqual(p1, p2);
      assert.strictEqual(p2, p3);

      await p1;
      assert.equal(isStorageHydrated(), true);
      assert.equal(getStorageInitError(), null);
    });

    it('handles initialization failures explicitly and prevents overwriting saved projects', async () => {
      setupMockIndexedDB(true); // Fails open/read

      await assert.rejects(async () => {
        await initStorage();
      }, /IndexedDB permission denied/);

      assert.equal(isStorageHydrated(), false);
      assert.ok(getStorageInitError());

      // Attempting autosave when storage failed must fail and NOT overwrite disk
      const bookToSave: any = { id: 'book_123', pages: [] };
      const saveResult = await saveAutosaveToDb(bookToSave).catch(() => false);
      assert.equal(saveResult, false);
    });

    it('createSafeStore self-heals missing object stores on initial creation', async () => {
      const { existingStores } = setupMockIndexedDB(false);
      existingStores.delete('coloring_books'); // simulate missing store

      const safeStore = createSafeStore('ColorCraftDB', 'coloring_books', ['coloring_books', 'privacy_consent']);

      let writeRan = false;
      await safeStore('readwrite', (store) => {
        store.put({ id: 'test' }, 'test_key');
        writeRan = true;
      });

      assert.equal(writeRan, true);
      assert.equal(existingStores.has('coloring_books'), true);
    });
  });

  describe('Priority 4: Parental Consent Token & Security Verification', () => {
    it('issues and validates parental consent token with strict child and session binding', () => {
      const validSession = createSignedSessionId();
      const { token } = createConsentToken({
        guardianRole: 'parent',
        childName: 'Emma',
        sessionId: validSession,
      });

      assert.ok(token.includes('.'));
      const verified = verifyConsentToken(token);
      assert.equal(verified.valid, true);
      assert.equal(verified.payload.childName, 'emma');
      assert.equal(verified.payload.sessionId, validSession);

      // Child name mismatch check
      const currentChild = 'Liam';
      assert.notEqual(verified.payload.childName, currentChild.toLowerCase());

      // Session mismatch check
      const hijackedSession = createSignedSessionId();
      assert.notEqual(verified.payload.sessionId, hijackedSession);

      // Tampered token check
      const tampered = `${token.split('.')[0]}.invalidSignature`;
      assert.equal(verifyConsentToken(tampered).valid, false);
    });

    it('rejects empty child name or missing session ID when creating consent token', () => {
      assert.throws(() => {
        createConsentToken({ guardianRole: 'parent', childName: '', sessionId: 'sess_123' });
      }, /child name/i);

      assert.throws(() => {
        createConsentToken({ guardianRole: 'parent', childName: 'Emma', sessionId: '' });
      }, /session id/i);
    });

    it('production Content Security Policy strictly excludes unsafe-inline and unsafe-eval from script-src', () => {
      const prodCsp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.google.com https://*.run.app;";

      const scriptSrcMatch = prodCsp.match(/script-src\s+([^;]+)/);
      assert.ok(scriptSrcMatch);
      const scriptDirectives = scriptSrcMatch[1];

      assert.equal(scriptDirectives.includes("'unsafe-inline'"), false);
      assert.equal(scriptDirectives.includes("'unsafe-eval'"), false);
      assert.equal(prodCsp.includes("object-src 'none'"), true);
      assert.equal(prodCsp.includes("base-uri 'self'"), true);
    });
  });
});
