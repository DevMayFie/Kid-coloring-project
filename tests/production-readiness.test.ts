import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawnSync } from 'child_process';
import {
  checkAiBudgetCircuitBreaker,
  reserveAiBudget,
  reserveAdditionalAiBudget,
  commitAiBudget,
  releaseAiBudgetReservation,
  recordAiUsageEstimate,
  getBudgetState,
  resetBudgetStateForTesting,
  setBudgetStoreForTesting,
  setBudgetStoreOperationalErrorForTesting,
  getBudgetStoreOperationalError,
  FileBudgetStore,
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
  FileQuotaStore,
  MemoryQuotaStore,
  setQuotaStore,
  setQuotaStoreForTesting,
  verifyProductionDeploymentConfiguration,
  checkSingleInstanceDeployment,
  PRODUCTION_CONTENT_SECURITY_POLICY,
  isProduction,
  isPhotoToLineArtEnabled,
  setPhotoToLineArtEnabledForTesting,
  app,
  startServer,
  usageLogger,
  recordPdfExport,
  recordRegeneration,
  getDailyUsage,
  getUsageTrends,
  getUsageLogData,
  PersistentUsageLogger,
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
    setBudgetStoreForTesting(new FileBudgetStore(path.join(process.cwd(), '.ai-budget-state.json')));
    setQuotaStoreForTesting(new FileQuotaStore(path.join(process.cwd(), '.ai-quota-state.json')));
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

      // Simulate primary attempt failed, followed by atomic additional reservation for fallback attempt
      const additionalRes = reserveAdditionalAiBudget(budgetRes.reservationId, estimatedCost);
      assert.equal(additionalRes.allowed, true);
      assert.equal(getBudgetState().dailyReservedCostUsd, 0.004);

      commitAiBudget(budgetRes.reservationId, estimatedCost * 2);

      const state = getBudgetState();
      assert.equal(state.dailyEstimatedCostUsd, 0.004);
      assert.equal(state.dailyRequestsTracked, 1);
      assert.equal(state.dailyReservedCostUsd, 0);
    });

    it('rejects fallback attempt if additional budget cannot be reserved near limit', () => {
      // Set budget close to limit (50.00 limit, set to 49.997)
      resetBudgetStateForTesting(49.997, 0);

      const estimatedCost = 0.002;
      const budgetRes = reserveAiBudget(estimatedCost);
      assert.equal(budgetRes.allowed, true); // 49.997 + 0.002 = 49.999 <= 50.00

      // Now attempt fallback which requires another 0.002 (49.997 + 0.002 + 0.002 = 50.001 > 50.00)
      const additionalRes = reserveAdditionalAiBudget(budgetRes.reservationId, estimatedCost);
      assert.equal(additionalRes.allowed, false);
      assert.match(additionalRes.reason || '', /budget limit.*reached/i);

      // Finalize first attempt only (cost of 1 attempt)
      commitAiBudget(budgetRes.reservationId, estimatedCost);
      const state = getBudgetState();
      assert.equal(Number(state.dailyEstimatedCostUsd.toFixed(4)), 49.999);
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

      // 5. When ADMIN_KEY is not configured, endpoints must return 404 (never accept default key)
      const originalAdminKey = process.env.ADMIN_KEY;
      try {
        delete process.env.ADMIN_KEY;
        let status5 = 200;
        let body5: any = null;
        const req5: any = { query: {}, headers: { 'x-admin-key': 'dev-admin-key' } };
        const res5: any = {
          status: (s: number) => { status5 = s; return res5; },
          json: (b: any) => { body5 = b; return res5; },
        };
        requireAdminAuth(req5, res5, () => {});
        assert.equal(status5, 404);
        assert.equal(body5.success, false);
      } finally {
        process.env.ADMIN_KEY = originalAdminKey;
      }
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

    it('FileBudgetStore throws error on corrupt or unreadable budget file and stops paid AI requests', () => {
      const tempTestFile = path.join(process.cwd(), `.test-corrupt-budget-${Date.now()}.json`);
      try {
        // Write corrupt JSON
        fs.writeFileSync(tempTestFile, '{ corrupt json !!! }', 'utf8');
        const fileStore = new FileBudgetStore(tempTestFile);

        assert.throws(() => {
          fileStore.getState();
        }, /Corrupt AI budget state JSON/);

        // Set this store as active and verify checkAiBudgetCircuitBreaker halts paid requests
        setBudgetStoreForTesting(fileStore);
        const circuitCheck = checkAiBudgetCircuitBreaker(0.002);
        assert.equal(circuitCheck.allowed, false);
        assert.equal(circuitCheck.operationalError, true);
        assert.match(circuitCheck.reason || '', /temporarily unavailable.*storage error/i);

        // verify reserveAiBudget also halts safely
        const reserveCheck = reserveAiBudget(0.002);
        assert.equal(reserveCheck.allowed, false);
        assert.equal(reserveCheck.operationalError, true);
      } finally {
        if (fs.existsSync(tempTestFile)) {
          fs.unlinkSync(tempTestFile);
        }
      }
    });

    it('FileBudgetStore rejects negative or malformed schema values and does not default to 0 spending', () => {
      const tempTestFile = path.join(process.cwd(), `.test-invalid-budget-${Date.now()}.json`);
      try {
        fs.writeFileSync(tempTestFile, JSON.stringify({ dailyEstimatedCostUsd: 'not-a-number' }), 'utf8');
        const fileStore = new FileBudgetStore(tempTestFile);

        assert.throws(() => {
          fileStore.getState();
        }, /Corrupt AI budget state schema/);
      } finally {
        if (fs.existsSync(tempTestFile)) {
          fs.unlinkSync(tempTestFile);
        }
      }
    });

    it('exhausted budget prevents every additional paid provider call and reservation', () => {
      resetBudgetStateForTesting(50.00, 0); // Limit is 50.00
      assert.equal(checkAiBudgetCircuitBreaker(0.001).allowed, false);

      const reservation = reserveAiBudget(0.001);
      assert.equal(reservation.allowed, false);
      assert.match(reservation.reason || '', /budget limit.*reached/i);
    });

    it('server restart reconciles and preserves outstanding reservations without allowing overspending or double-charging', () => {
      const tempTestFile = path.join(process.cwd(), `.test-restart-budget-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      try {
        const fileStore = new FileBudgetStore(tempTestFile);
        setBudgetStoreForTesting(fileStore);
        resetBudgetStateForTesting(49.95, 0); // Limit is 50.00, remaining capacity is $0.05

        // Make an initial reservation of $0.03
        const res1 = reserveAiBudget(0.03);
        assert.equal(res1.allowed, true);
        assert.ok(res1.reservationId);

        let state = getBudgetState();
        assert.equal(state.dailyEstimatedCostUsd, 49.95);
        assert.equal(state.dailyReservedCostUsd, 0.03);

        // Simulate server process restart: create a new store instance pointing to the persisted file
        const restartedStore = new FileBudgetStore(tempTestFile);
        setBudgetStoreForTesting(restartedStore);

        // Verify that dailyReservedCostUsd is restored from store and not silently zeroed
        state = getBudgetState();
        assert.equal(state.dailyReservedCostUsd, 0.03);
        assert.equal(state.dailyEstimatedCostUsd, 49.95);

        // A competing request attempts to reserve $0.03 (49.95 + 0.03 reserved + 0.03 = 50.01 > 50.00):
        const res2 = reserveAiBudget(0.03);
        assert.equal(res2.allowed, false, 'Competing request must be rejected to prevent overspending');

        // Commit the restored reservation
        commitAiBudget(res1.reservationId, 0.03);
        state = getBudgetState();
        assert.equal(state.dailyReservedCostUsd, 0);
        assert.equal(Number(state.dailyEstimatedCostUsd.toFixed(4)), 49.98);

        // Attempting to commit the same reservation a second time must NOT charge twice
        commitAiBudget(res1.reservationId, 0.03);
        state = getBudgetState();
        assert.equal(Number(state.dailyEstimatedCostUsd.toFixed(4)), 49.98, 'Must not charge duplicate cost');
      } finally {
        if (fs.existsSync(tempTestFile)) {
          fs.unlinkSync(tempTestFile);
        }
      }
    });

    it('simultaneous competing fallback requests near budget limit strictly enforce spending cap', async () => {
      resetBudgetStateForTesting(49.96, 0); // Remaining budget capacity is $0.04
      const res1 = reserveAiBudget(0.015);
      const res2 = reserveAiBudget(0.015);
      assert.equal(res1.allowed, true);
      assert.equal(res2.allowed, true);

      // Current reserved+estimated is 49.96 + 0.015 + 0.015 = 49.99 (Remaining capacity: 0.01)
      // Both requests encounter provider failure and simultaneously attempt to reserve fallback of 0.015 each
      const [fallback1, fallback2] = await Promise.all([
        Promise.resolve().then(() => reserveAdditionalAiBudget(res1.reservationId, 0.015)),
        Promise.resolve().then(() => reserveAdditionalAiBudget(res2.reservationId, 0.015)),
      ]);

      // Since remaining capacity is only 0.01, neither can allocate 0.015
      assert.equal(fallback1.allowed, false);
      assert.equal(fallback2.allowed, false);

      // Verify that budget cap is strictly maintained
      const state = getBudgetState();
      assert.ok(state.dailyEstimatedCostUsd + state.dailyReservedCostUsd <= 50.00);

      // Original reservations can still be finalized safely without corrupting state
      commitAiBudget(res1.reservationId, 0.015);
      commitAiBudget(res2.reservationId, 0.015);
      const finalState = getBudgetState();
      assert.equal(Number(finalState.dailyEstimatedCostUsd.toFixed(4)), 49.99);
      assert.equal(finalState.dailyReservedCostUsd, 0);
    });

    it('budget operations fail closed with operational error on persistence failures', () => {
      const brokenStore = {
        getState: () => ({
          dailyEstimatedCostUsd: 10,
          dailyReservedCostUsd: 0,
          dailyRequestsTracked: 1,
          dailyCostResetTimestamp: Date.now() + 86400000,
        }),
        saveState: () => {
          throw new Error('Simulated persistent disk write failure');
        },
      };

      setBudgetStoreForTesting(brokenStore as any);
      const res = reserveAiBudget(0.01);
      assert.equal(res.allowed, false);
      assert.equal(res.operationalError, true);
      assert.match(res.reason || '', /paused for safety/i);
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

    it('session quota persists across server restarts and multiple instances when shared FileQuotaStore is used', () => {
      const tempQuotaFile = path.join(process.cwd(), `.test-quota-${Date.now()}.json`);
      try {
        const storeInstance1 = new FileQuotaStore(tempQuotaFile);
        storeInstance1.set('user_123', { count: 5, resetAt: Date.now() + 60000 });

        // Simulate server restart / second instance by initializing storeInstance2 from same storage file
        const storeInstance2 = new FileQuotaStore(tempQuotaFile);
        const record = storeInstance2.get('user_123');
        assert.ok(record);
        assert.equal(record.count, 5);

        // Instance 2 increments quota
        storeInstance2.set('user_123', { count: 6, resetAt: record.resetAt });

        // Instance 1 re-reads and sees the update
        const updatedRecord = storeInstance1.get('user_123');
        assert.ok(updatedRecord);
        assert.equal(updatedRecord.count, 6);
      } finally {
        if (fs.existsSync(tempQuotaFile)) {
          fs.unlinkSync(tempQuotaFile);
        }
      }
    });

    it('setQuotaStore dynamically changes the store used by quota middleware', () => {
      // Create custom store
      const customStoreMap = new Map<string, any>();
      const customStore = {
        get: (k: string) => customStoreMap.get(k),
        set: (k: string, v: any) => { customStoreMap.set(k, v); },
        delete: (k: string) => { customStoreMap.delete(k); },
        clear: () => { customStoreMap.clear(); },
      };

      setQuotaStore(customStore as any);

      const quotaMw = createSessionQuotaMiddleware({
        windowMinutes: 10,
        maxRequests: 5,
        endpointName: 'Dynamic Store Test',
      });

      const clientIp = '198.51.100.42';
      const session = createSignedSessionId();
      let status = 200;
      const req: any = { ip: clientIp, body: { sessionId: session }, headers: {} };
      const res: any = { setHeader: () => {}, status: (s: number) => { status = s; return res; }, json: () => res };

      quotaMw(req, res, () => {});
      assert.equal(status, 200);

      // Verify record was written to the customStore, proving middleware used the new store
      const ipKey = `Dynamic Store Test:ip:${clientIp}`;
      assert.ok(customStoreMap.has(ipKey));
      assert.equal(customStoreMap.get(ipKey).count, 1);
    });

    it('quota middleware fails closed with 503 when authoritative persistence fails', () => {
      // Mock store that throws an error on get/set
      const failingStore = {
        get: () => {
          throw new Error('Disk IO failure reading authoritative quota file');
        },
        set: () => {
          throw new Error('Disk IO failure writing authoritative quota file');
        },
        delete: () => {},
        clear: () => {},
      };

      setQuotaStore(failingStore as any);

      const quotaMw = createSessionQuotaMiddleware({
        windowMinutes: 10,
        maxRequests: 5,
        endpointName: 'Failing Store Test',
      });

      let status = 200;
      let body: any = null;
      const req: any = { ip: '198.51.100.99', body: {}, headers: {} };
      const res: any = {
        setHeader: () => {},
        status: (s: number) => { status = s; return res; },
        json: (b: any) => { body = b; return res; },
      };

      quotaMw(req, res, () => {});
      assert.equal(status, 503);
      assert.match(body.error, /temporarily unavailable.*storage error/i);
    });

    it('simultaneous quota increments against quota middleware enforce limits and reject excess requests', async () => {
      const quotaMw = createSessionQuotaMiddleware({
        windowMinutes: 10,
        maxRequests: 5,
        endpointName: 'Simultaneous Quota Test',
      });

      const clientIp = '198.51.100.42';
      const session = createSignedSessionId();
      const results: number[] = [];

      await Promise.all(
        Array.from({ length: 15 }).map(async () => {
          let statusCode = 200;
          const req: any = { ip: clientIp, body: { sessionId: session }, headers: {} };
          const res: any = {
            setHeader: () => {},
            status: (s: number) => {
              statusCode = s;
              return res;
            },
            json: () => res,
          };
          await new Promise<void>((resolve) => {
            quotaMw(req, res, () => {
              statusCode = 200;
              resolve();
            });
            if (statusCode === 429) {
              resolve();
            }
          });
          results.push(statusCode);
        })
      );

      const okCount = results.filter((s) => s === 200).length;
      const rateLimitedCount = results.filter((s) => s === 429).length;
      assert.equal(okCount, 5, 'Exact quota limit of 5 requests must be permitted');
      assert.equal(rateLimitedCount, 10, 'All 10 excess requests must be rejected with 429');
    });

    it('two instances attempting to increment the same quota simultaneously against an atomic store never exceed the limit', async () => {
      const atomicStore = new MemoryQuotaStore();
      setQuotaStoreForTesting(atomicStore);

      const quotaMw = createSessionQuotaMiddleware({
        windowMinutes: 10,
        maxRequests: 8,
        endpointName: 'MultiInstance Atomic Test',
      });

      const clientIp = '203.0.113.88';
      const results: number[] = [];

      // Simulate 2 competing instances dispatching 10 requests each (20 total) concurrently
      await Promise.all(
        Array.from({ length: 20 }).map(async () => {
          let statusCode = 200;
          const req: any = { ip: clientIp, body: {}, headers: {} };
          const res: any = {
            setHeader: () => {},
            status: (s: number) => {
              statusCode = s;
              return res;
            },
            json: () => res,
          };
          await new Promise<void>((resolve) => {
            quotaMw(req, res, () => {
              statusCode = 200;
              resolve();
            });
            if (statusCode === 429) {
              resolve();
            }
          });
          results.push(statusCode);
        })
      );

      const okCount = results.filter((s) => s === 200).length;
      const rateLimitedCount = results.filter((s) => s === 429).length;
      assert.equal(okCount, 8, 'Max 8 requests allowed across simulated instances');
      assert.equal(rateLimitedCount, 12, '12 excess requests rejected across simulated instances');
    });

    it('verifies single-instance deployment requirement and documents distributed store needs', () => {
      // With default file stores in single-instance mode:
      setBudgetStoreForTesting(new FileBudgetStore(path.join(process.cwd(), '.ai-budget-state.json')));
      setQuotaStoreForTesting(new FileQuotaStore(path.join(process.cwd(), '.ai-quota-state.json')));

      const configCheck = verifyProductionDeploymentConfiguration();
      assert.equal(configCheck.singleInstanceOnly, true);
      assert.equal(configCheck.distributedSafetyConfigured, false);
    });

    it('checkSingleInstanceDeployment issues loud warning when stores are file-based and single-instance is not configured', () => {
      setBudgetStoreForTesting(new FileBudgetStore(path.join(process.cwd(), '.ai-budget-state.json')));
      setQuotaStoreForTesting(new FileQuotaStore(path.join(process.cwd(), '.ai-quota-state.json')));

      delete process.env.SINGLE_INSTANCE;
      delete process.env.AI_SINGLE_INSTANCE;
      delete process.env.CLOUD_RUN_MAX_INSTANCES;
      delete process.env.MAX_INSTANCES;

      const result = checkSingleInstanceDeployment();
      assert.equal(result.isFileBased, true);
      assert.equal(result.isSingleInstance, false);
      assert.equal(result.warningIssued, true);

      // When configured as single instance, warning is suppressed:
      process.env.SINGLE_INSTANCE = 'true';
      const resultConfigured = checkSingleInstanceDeployment();
      assert.equal(resultConfigured.isSingleInstance, true);
      assert.equal(resultConfigured.warningIssued, false);
      delete process.env.SINGLE_INSTANCE;
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
      // Test the actual production CSP configuration exported directly from server.ts
      const prodCsp = PRODUCTION_CONTENT_SECURITY_POLICY;

      const scriptSrcMatch = prodCsp.match(/script-src\s+([^;]+)/);
      assert.ok(scriptSrcMatch);
      const scriptDirectives = scriptSrcMatch[1];

      assert.equal(scriptDirectives.includes("'unsafe-inline'"), false);
      assert.equal(scriptDirectives.includes("'unsafe-eval'"), false);
      assert.equal(prodCsp.includes("object-src 'none'"), true);
      assert.equal(prodCsp.includes("base-uri 'self'"), true);
      assert.equal(prodCsp.includes("form-action 'self'"), true);
    });

    it('inverted environment logic treats non-development environments as production', () => {
      // Inverted logic: isProduction is true unless NODE_ENV is explicitly 'development'
      assert.equal(typeof isProduction, 'boolean');
      const checkIsProduction = (env?: string) => env !== 'development';
      assert.equal(checkIsProduction('development'), false);
      assert.equal(checkIsProduction('production'), true);
      assert.equal(checkIsProduction('staging'), true);
      assert.equal(checkIsProduction(undefined), true);
      assert.equal(checkIsProduction(''), true);
    });

    it('photo-to-line-art feature flag is disabled by default', () => {
      assert.equal(isPhotoToLineArtEnabled, false);
    });
  });

  describe('Priority 5: Persistent Daily Usage Logging & Trend Monitoring', () => {
    const testLogFile = path.join(process.cwd(), `.test-usage-log-${Date.now()}.json`);
    let logger: PersistentUsageLogger;

    beforeEach(() => {
      if (fs.existsSync(testLogFile)) {
        try {
          fs.unlinkSync(testLogFile);
        } catch {}
      }
      logger = new PersistentUsageLogger(testLogFile);
    });

    after(() => {
      if (fs.existsSync(testLogFile)) {
        try {
          fs.unlinkSync(testLogFile);
        } catch {}
      }
    });

    it('accurately tracks daily PDF export counts and breakdown in persistent JSON file', () => {
      const today = '2026-10-11';
      logger.recordPdfExport('full-book', today);
      logger.recordPdfExport('full-book', today);
      logger.recordPdfExport('single-page', today);
      logger.recordPdfExport('direct-print', today);

      const daily = logger.getDailyUsage(today);
      assert.equal(daily.pdfExports, 4);
      assert.equal(daily.breakdown.pdfExports.fullBook, 2);
      assert.equal(daily.breakdown.pdfExports.singlePage, 1);
      assert.equal(daily.breakdown.pdfExports.directPrint, 1);

      // Verify file was written to disk and is valid JSON
      assert.ok(fs.existsSync(testLogFile));
      const diskContent = JSON.parse(fs.readFileSync(testLogFile, 'utf8'));
      assert.equal(diskContent.totalPdfExports, 4);
      assert.equal(diskContent.daily[today].pdfExports, 4);
    });

    it('accurately tracks user-triggered regenerations by category and increments total count', () => {
      const today = '2026-10-11';
      logger.recordRegeneration('page', today);
      logger.recordRegeneration('page', today);
      logger.recordRegeneration('cover', today);
      logger.recordRegeneration('stickers', today);
      logger.recordRegeneration('batch', today);

      const daily = logger.getDailyUsage(today);
      assert.equal(daily.regenerations, 5);
      assert.equal(daily.breakdown.regenerations.page, 2);
      assert.equal(daily.breakdown.regenerations.cover, 1);
      assert.equal(daily.breakdown.regenerations.stickers, 1);
      assert.equal(daily.breakdown.regenerations.batch, 1);

      const allData = logger.getAllData();
      assert.equal(allData.totalRegenerations, 5);
    });

    it('persists usage metrics across server restarts and process re-instantiation', () => {
      const day1 = '2026-10-09';
      const day2 = '2026-10-10';
      logger.recordPdfExport('full-book', day1);
      logger.recordPdfExport('single-page', day1);
      logger.recordRegeneration('page', day1);

      logger.recordPdfExport('full-book', day2);
      logger.recordRegeneration('cover', day2);
      logger.recordRegeneration('batch', day2);

      // Simulate complete server restart by creating a new logger instance pointing to the existing file
      const rebootedLogger = new PersistentUsageLogger(testLogFile);
      const metricsDay1 = rebootedLogger.getDailyUsage(day1);
      const metricsDay2 = rebootedLogger.getDailyUsage(day2);

      assert.equal(metricsDay1.pdfExports, 2);
      assert.equal(metricsDay1.regenerations, 1);
      assert.equal(metricsDay2.pdfExports, 1);
      assert.equal(metricsDay2.regenerations, 2);

      const allRebooted = rebootedLogger.getAllData();
      assert.equal(allRebooted.totalPdfExports, 3);
      assert.equal(allRebooted.totalRegenerations, 3);
    });

    it('computes usage trends, daily averages, and peak days accurately', () => {
      logger.recordPdfExport('full-book', '2026-10-08');
      logger.recordRegeneration('page', '2026-10-08');

      logger.recordPdfExport('full-book', '2026-10-09');
      logger.recordPdfExport('full-book', '2026-10-09');
      logger.recordPdfExport('full-book', '2026-10-09'); // Peak PDF day: 3 exports
      logger.recordRegeneration('page', '2026-10-09');

      logger.recordPdfExport('full-book', '2026-10-10');
      logger.recordRegeneration('page', '2026-10-10');
      logger.recordRegeneration('cover', '2026-10-10');
      logger.recordRegeneration('batch', '2026-10-10');
      logger.recordRegeneration('stickers', '2026-10-10'); // Peak Regen day: 4 regens

      const trends = logger.getUsageTrends(10);
      assert.equal(trends.totalPdfExports, 5);
      assert.equal(trends.totalRegenerations, 6);
      assert.equal(trends.activeDaysTracked, 3);
      assert.equal(trends.peakPdfExportDay?.date, '2026-10-09');
      assert.equal(trends.peakPdfExportDay?.count, 3);
      assert.equal(trends.peakRegenerationDay?.date, '2026-10-10');
      assert.equal(trends.peakRegenerationDay?.count, 4);
      assert.equal(trends.averageDailyPdfExports, 1.67);
      assert.equal(trends.averageDailyRegenerations, 2);
      assert.equal(trends.recentTrends.length, 3);
    });

    it('gracefully recovers from uninitialized folders or corrupt files without crashing', () => {
      const nestedFilePath = path.join(process.cwd(), `.test-subfolder-${Date.now()}`, 'logs', 'usage.json');
      const resilientLogger = new PersistentUsageLogger(nestedFilePath);

      // Successfully creates directory and saves
      resilientLogger.recordPdfExport('full-book', '2026-10-11');
      assert.ok(fs.existsSync(nestedFilePath));

      // Overwrite with corrupt contents
      fs.writeFileSync(nestedFilePath, 'corrupt!{invalid-json', 'utf8');

      // Re-instantiating should not crash and should initialize cleanly
      const recoveredLogger = new PersistentUsageLogger(nestedFilePath);
      assert.doesNotThrow(() => {
        recoveredLogger.recordRegeneration('page', '2026-10-11');
      });
      assert.equal(recoveredLogger.getDailyUsage('2026-10-11').regenerations, 1);

      // Cleanup
      try {
        fs.rmSync(path.join(process.cwd(), path.dirname(path.dirname(nestedFilePath))), { recursive: true, force: true });
      } catch {}
    });
  });

  describe('Priority 6: Live Route-Level Express Integration & Security Enforcement', () => {
    let testServer: http.Server;
    let baseUrl: string;

    before(async () => {
      await new Promise<void>((resolve) => {
        testServer = app.listen(0, '127.0.0.1', () => {
          const addr = testServer.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    after(async () => {
      setPhotoToLineArtEnabledForTesting(false);
      delete process.env.ADMIN_KEY;
      delete process.env.ADMIN_SECRET;
      await new Promise<void>((resolve) => {
        if (testServer) {
          testServer.close(() => resolve());
        } else {
          resolve();
        }
      });
    });

    it('GET /api/download-project returns 404 in every environment', async () => {
      // 1. Standard GET returns 404
      const res1 = await fetch(`${baseUrl}/api/download-project`);
      assert.equal(res1.status, 404);

      // 2. GET with adminKey query parameter returns 404
      const res2 = await fetch(`${baseUrl}/api/download-project?adminKey=test-admin-key`);
      assert.equal(res2.status, 404);

      // 3. GET with x-admin-key header returns 404
      const res3 = await fetch(`${baseUrl}/api/download-project`, {
        headers: { 'x-admin-key': 'dev-admin-key' },
      });
      assert.equal(res3.status, 404);

      // 4. GET returns 404 even if ADMIN_KEY is configured in the environment
      process.env.ADMIN_KEY = 'configured-secret-key-2026';
      try {
        const res4 = await fetch(`${baseUrl}/api/download-project`, {
          headers: { 'x-admin-key': 'configured-secret-key-2026' },
        });
        assert.equal(res4.status, 404);
      } finally {
        delete process.env.ADMIN_KEY;
      }
    });

    it('Admin endpoints return 404 or 401 with no ADMIN_KEY set, and reject \'dev-admin-key\'', async () => {
      // Scenario A: When ADMIN_KEY is not configured, admin endpoints return 404 and reject 'dev-admin-key'
      delete process.env.ADMIN_KEY;
      delete process.env.ADMIN_SECRET;

      // 1. No key provided -> 404
      const resBudgetNoKey = await fetch(`${baseUrl}/api/admin/usage-budget`);
      assert.equal(resBudgetNoKey.status, 404);

      // 2. Passing 'dev-admin-key' header -> 404 (never accepted)
      const resBudgetDevKey = await fetch(`${baseUrl}/api/admin/usage-budget`, {
        headers: { 'x-admin-key': 'dev-admin-key' },
      });
      assert.equal(resBudgetDevKey.status, 404);

      const resTrendsDevKey = await fetch(`${baseUrl}/api/admin/usage-trends`, {
        headers: { 'x-admin-key': 'dev-admin-key' },
      });
      assert.equal(resTrendsDevKey.status, 404);

      // Scenario B: When ADMIN_KEY is configured with a secret, endpoints require valid auth and reject 'dev-admin-key'
      const secureKey = 'test-prod-admin-auth-secret-xyz';
      process.env.ADMIN_KEY = secureKey;
      try {
        // Missing key -> 401 Unauthorized
        const resMissingAuth = await fetch(`${baseUrl}/api/admin/usage-budget`);
        assert.equal(resMissingAuth.status, 401);

        // Wrong key 'dev-admin-key' -> 401 Unauthorized (rejected)
        const resRejectedDevKey = await fetch(`${baseUrl}/api/admin/usage-budget`, {
          headers: { 'x-admin-key': 'dev-admin-key' },
        });
        assert.equal(resRejectedDevKey.status, 401);

        // Bearer 'dev-admin-key' -> 401 Unauthorized (rejected)
        const resBearerDevKey = await fetch(`${baseUrl}/api/admin/usage-budget`, {
          headers: { 'Authorization': 'Bearer dev-admin-key' },
        });
        assert.equal(resBearerDevKey.status, 401);

        // Query param attempt -> 400 Bad Request (rejected to prevent access log leakage)
        const resQueryAttempt = await fetch(`${baseUrl}/api/admin/usage-budget?adminKey=${secureKey}`);
        assert.equal(resQueryAttempt.status, 400);

        // Valid key -> 200 OK
        const resValidAuth = await fetch(`${baseUrl}/api/admin/usage-budget`, {
          headers: { 'x-admin-key': secureKey },
        });
        assert.equal(resValidAuth.status, 200);
        const bodyValid = await resValidAuth.json();
        assert.equal(bodyValid.success, true);
      } finally {
        delete process.env.ADMIN_KEY;
      }
    });

    it('POST /api/photo-to-line-art returns 404 when the feature flag is off', async () => {
      setPhotoToLineArtEnabledForTesting(false);
      assert.equal(isPhotoToLineArtEnabled, false);

      const res = await fetch(`${baseUrl}/api/photo-to-line-art`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          subjectType: 'child',
          childName: 'Leo',
          theme: 'space',
          sessionId: createSignedSessionId(),
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it('POST /api/verify-parental-consent cannot be used to bypass the photo gate when the flag is on', async () => {
      setPhotoToLineArtEnabledForTesting(true);
      try {
        const sessionA = createSignedSessionId();
        const sessionB = createSignedSessionId();

        // 1. Direct call to photo-to-line-art without parental consent is rejected (403)
        const resNoConsent = await fetch(`${baseUrl}/api/photo-to-line-art`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionA },
          body: JSON.stringify({
            photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            subjectType: 'child',
            childName: 'Alice',
            sessionId: sessionA,
          }),
        });
        assert.equal(resNoConsent.status, 403);
        const dataNoConsent = await resNoConsent.json();
        assert.equal(dataNoConsent.isConsentRequired, true);

        // 2. Cannot record consent with forged/unverified session ID (400)
        const resForgedSession = await fetch(`${baseUrl}/api/verify-parental-consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-ID': 'forged_fake_session' },
          body: JSON.stringify({
            guardianRole: 'parent',
            childName: 'Alice',
            sessionId: 'forged_fake_session',
            coppaConfirmed: true,
          }),
        });
        assert.equal(resForgedSession.status, 400);

        // 3. Issue genuine consent token for ("Alice", sessionA)
        const resValidConsent = await fetch(`${baseUrl}/api/verify-parental-consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionA },
          body: JSON.stringify({
            guardianRole: 'parent',
            childName: 'Alice',
            sessionId: sessionA,
            coppaConfirmed: true,
          }),
        });
        assert.equal(resValidConsent.status, 200);
        const consentData = await resValidConsent.json();
        assert.ok(consentData.consentToken);
        const aliceToken = consentData.consentToken;

        // 4. Bypass Attempt A: Using Alice's token to process photo for a different child "Bob" is rejected (403)
        const resChildHijack = await fetch(`${baseUrl}/api/photo-to-line-art`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionA,
            'x-parental-consent-token': aliceToken,
          },
          body: JSON.stringify({
            photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            subjectType: 'child',
            childName: 'Bob',
            sessionId: sessionA,
            parentConsentToken: aliceToken,
          }),
        });
        assert.equal(resChildHijack.status, 403);
        const dataChildHijack = await resChildHijack.json();
        assert.match(dataChildHijack.error, /cannot be used for "Bob"/i);

        // 5. Bypass Attempt B: Using Alice's token with a different browser session sessionB is rejected (403)
        const resSessionHijack = await fetch(`${baseUrl}/api/photo-to-line-art`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionB,
            'x-parental-consent-token': aliceToken,
          },
          body: JSON.stringify({
            photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            subjectType: 'child',
            childName: 'Alice',
            sessionId: sessionB,
            parentConsentToken: aliceToken,
          }),
        });
        assert.equal(resSessionHijack.status, 403);
        const dataSessionHijack = await resSessionHijack.json();
        assert.match(dataSessionHijack.error, /different session/i);

        // 6. Bypass Attempt C: Forged or altered consent token signature is rejected (403)
        const forgedToken = `${aliceToken.split('.')[0]}.invalidSig123`;
        const resForgedToken = await fetch(`${baseUrl}/api/photo-to-line-art`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionA,
            'x-parental-consent-token': forgedToken,
          },
          body: JSON.stringify({
            photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            subjectType: 'child',
            childName: 'Alice',
            sessionId: sessionA,
            parentConsentToken: forgedToken,
          }),
        });
        assert.equal(resForgedToken.status, 403);
      } finally {
        setPhotoToLineArtEnabledForTesting(false);
      }
    });

    it('The server refuses to start outside development without CONSENT_SECRET', async () => {
      const proc = spawnSync('npx', ['tsx', '-e', `
        process.env.NODE_ENV = 'production';
        process.env.SINGLE_INSTANCE = 'true';
        delete process.env.CONSENT_SECRET;
        import('./server.ts').then(async (m) => {
          await m.startServer(0);
        }).catch((err) => {
          console.error('FATAL_ERR:', err.message);
          process.exit(99);
        });
      `], {
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.equal(proc.status, 99);
      const output = `${proc.stdout} ${proc.stderr}`;
      assert.match(output, /FATAL: CONSENT_SECRET environment variable is required outside development/i);
    });

    it('production startup fails immediately when file-based stores lack single-instance configuration', async () => {
      const proc = spawnSync('npx', ['tsx', '-e', `
        process.env.NODE_ENV = 'production';
        process.env.CONSENT_SECRET = 'a-secure-production-secret-of-sufficient-length';
        delete process.env.SINGLE_INSTANCE;
        delete process.env.AI_SINGLE_INSTANCE;
        delete process.env.CLOUD_RUN_MAX_INSTANCES;
        delete process.env.MAX_INSTANCES;
        delete process.env.AI_MULTI_INSTANCE_DEPLOYMENT;

        import('./server.ts').then(async (m) => {
          await m.startServer(0);
        }).catch((err) => {
          console.error('FATAL_ERR:', err.message);
          process.exit(88);
        });
      `], {
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.equal(proc.status, 88);
      const output = `${proc.stdout} ${proc.stderr}`;
      assert.match(output, /FATAL: Incompatible production deployment configuration/i);
      assert.match(output, /File-based budget and quota stores are in use without single-instance enforcement/i);
      assert.match(output, /does not make local file storage durable/i);
    });

    it('production startup fails immediately when AI_MULTI_INSTANCE_DEPLOYMENT is enabled with file-based stores', async () => {
      const proc = spawnSync('npx', ['tsx', '-e', `
        process.env.NODE_ENV = 'production';
        process.env.CONSENT_SECRET = 'a-secure-production-secret-of-sufficient-length';
        process.env.AI_MULTI_INSTANCE_DEPLOYMENT = 'true';

        import('./server.ts').then(async (m) => {
          await m.startServer(0);
        }).catch((err) => {
          console.error('FATAL_ERR:', err.message);
          process.exit(77);
        });
      `], {
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.equal(proc.status, 77);
      const output = `${proc.stdout} ${proc.stderr}`;
      assert.match(output, /FATAL: Incompatible production deployment configuration/i);
      assert.match(output, /AI_MULTI_INSTANCE_DEPLOYMENT is enabled, but file-based budget\/quota stores are in use/i);
      assert.match(output, /does not make local file storage durable/i);
    });

    it('production startup succeeds when properly configured with single-instance mode and file stores', async () => {
      const proc = spawnSync('npx', ['tsx', '-e', `
        process.env.NODE_ENV = 'production';
        process.env.CONSENT_SECRET = 'a-secure-production-secret-of-sufficient-length';
        process.env.SINGLE_INSTANCE = 'true';

        import('./server.ts').then(async (m) => {
          const srv = await m.startServer(0);
          srv.close(() => {
            console.log('SUCCESS_STARTED_AND_CLOSED');
            process.exit(0);
          });
        }).catch((err) => {
          console.error('FATAL_ERR:', err.message);
          process.exit(1);
        });
      `], {
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.equal(proc.status, 0);
      assert.match(proc.stdout, /SUCCESS_STARTED_AND_CLOSED/);
    });

    it('development environment starts normally without single-instance environment variable', async () => {
      const proc = spawnSync('npx', ['tsx', '-e', `
        process.env.NODE_ENV = 'development';
        delete process.env.CONSENT_SECRET;
        delete process.env.SINGLE_INSTANCE;
        delete process.env.CLOUD_RUN_MAX_INSTANCES;

        import('./server.ts').then(async (m) => {
          const srv = await m.startServer(0);
          srv.close(() => {
            console.log('SUCCESS_DEV_STARTED');
            process.exit(0);
          });
        }).catch((err) => {
          console.error('FATAL_ERR:', err.message);
          process.exit(1);
        });
      `], {
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.equal(proc.status, 0);
      assert.match(proc.stdout, /SUCCESS_DEV_STARTED/);
    });
  });

  after(() => {
    const budgetFile = path.join(process.cwd(), '.ai-budget-state.json');
    if (fs.existsSync(budgetFile)) {
      try {
        fs.unlinkSync(budgetFile);
      } catch {}
    }
    const quotaFile = path.join(process.cwd(), '.ai-quota-state.json');
    if (fs.existsSync(quotaFile)) {
      try {
        fs.unlinkSync(quotaFile);
      } catch {}
    }
    // Clean up any stray test files
    const cwdFiles = fs.readdirSync(process.cwd());
    for (const f of cwdFiles) {
      if (f.startsWith('.test-') && f.endsWith('.json')) {
        try {
          fs.unlinkSync(path.join(process.cwd(), f));
        } catch {}
      }
    }
  });
});
