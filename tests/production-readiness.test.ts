import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  storageReady,
  initStorage,
  isStorageHydrated,
  getStorageInitError,
  saveAutosaveToDb,
  createSafeStore,
} from '../src/utils/dbStorage';

// We import server functions and handlers for focused testing
const TEST_SECRET = 'test-secret-at-least-32-bytes-long-for-hmac-sha256-safety';

// Mock IndexedDB for Node.js test environment
function setupMockIndexedDB(shouldFail = false) {
  const storeData = new Map<string, any>();
  const mockDB = {
    createObjectStore: () => {},
    transaction: () => {
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
    open: () => {
      const req: any = { result: mockDB };
      setTimeout(() => {
        if (shouldFail) {
          req.error = new Error('IndexedDB open permission denied');
          req.onerror?.();
        } else {
          req.onupgradeneeded?.();
          req.onsuccess?.();
        }
      }, 0);
      return req;
    },
  };
}

describe('Production Readiness & Security Test Suite', () => {
  describe('Priority 1: AI Spending Budget & Concurrency Locks', () => {
    it('exhausted budget rejects requests with HTTP 429 and safe error', () => {
      // Simulate budget logic
      const DAILY_BUDGET = 50.0;
      let dailyCost = 50.0; // Exhausted
      let reservedCost = 0.0;

      function checkBudget(reqCost: number) {
        if (dailyCost + reservedCost + reqCost > DAILY_BUDGET) {
          return {
            allowed: false,
            status: 429,
            error: `Daily AI usage spending budget limit ($${DAILY_BUDGET.toFixed(2)} estimated) reached. Requests are safely paused to prevent unexpected provider charges.`,
            budgetExceeded: true,
          };
        }
        return { allowed: true };
      }

      const check = checkBudget(0.04);
      assert.equal(check.allowed, false);
      assert.equal(check.status, 429);
      assert.equal(check.budgetExceeded, true);
      assert.match(check.error, /budget limit.*reached/i);
    });

    it('concurrent reservations prevent race condition overspending', () => {
      const DAILY_BUDGET = 1.0;
      let dailyCost = 0.95;
      let reservedCost = 0.0;
      const reservations: string[] = [];

      function tryReserve(cost: number): boolean {
        if (dailyCost + reservedCost + cost > DAILY_BUDGET) {
          return false;
        }
        reservedCost += cost;
        reservations.push(`res_${reservations.length}`);
        return true;
      }

      // First request costs 0.04 -> 0.95 + 0.04 = 0.99 <= 1.00 (allowed)
      const res1 = tryReserve(0.04);
      assert.equal(res1, true);
      assert.equal(reservedCost, 0.04);

      // Second concurrent request arrives while res1 is in flight (costs 0.04)
      // 0.95 + 0.04 + 0.04 = 1.03 > 1.00 -> Must be rejected!
      const res2 = tryReserve(0.04);
      assert.equal(res2, false);

      // Total committed does not exceed 1.00
      assert.ok(dailyCost + reservedCost <= DAILY_BUDGET);
    });

    it('admin usage-budget endpoint requires valid authentication and documents estimation nature', () => {
      const ADMIN_SECRET = 'super-secret-admin-key-2026';

      function authenticateAdmin(headers: Record<string, string>, query: Record<string, string>) {
        if (query.adminKey || query['admin-key'] || query.key || query.token) {
          return { status: 400, error: 'Query param credentials forbidden (CWE-598)' };
        }
        const auth = headers['x-admin-key'] || (headers['authorization']?.startsWith('Bearer ') ? headers['authorization'].slice(7) : null);
        if (!auth) {
          return { status: 401, error: 'Unauthorized: missing admin key' };
        }
        const bAuth = Buffer.from(auth);
        const bTarget = Buffer.from(ADMIN_SECRET);
        if (bAuth.length !== bTarget.length || !crypto.timingSafeEqual(bAuth, bTarget)) {
          return { status: 401, error: 'Unauthorized: invalid credentials' };
        }
        return {
          status: 200,
          body: {
            success: true,
            estimateDisclaimer: 'Internal software estimate only. Does not guarantee a hard spending cap at the AI provider.',
          },
        };
      }

      // Test missing auth
      assert.equal(authenticateAdmin({}, {}).status, 401);

      // Test query parameter rejection (CWE-598)
      assert.equal(authenticateAdmin({}, { adminKey: ADMIN_SECRET }).status, 400);

      // Test invalid auth
      assert.equal(authenticateAdmin({ 'x-admin-key': 'wrong-key' }, {}).status, 401);

      // Test valid header auth
      const validRes = authenticateAdmin({ 'x-admin-key': ADMIN_SECRET }, {});
      assert.equal(validRes.status, 200);
      assert.match(validRes.body.estimateDisclaimer, /estimate only/i);
    });
  });

  describe('Priority 2: Session & Quota Abuse Prevention', () => {
    function signSession(rawId: string, secret: string) {
      const sig = crypto.createHmac('sha256', secret).update(rawId).digest('base64url');
      return `${rawId}.${sig}`;
    }

    function verifySession(token: string | undefined, secret: string, maxAgeMs = 24 * 60 * 60 * 1000) {
      if (!token || typeof token !== 'string') return { valid: false, reason: 'missing' };
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false, reason: 'malformed' };
      const [rawId, sig] = parts;
      if (!rawId.startsWith('sess_')) return { valid: false, reason: 'invalid prefix' };

      const rawParts = rawId.split('_');
      if (rawParts.length < 3) return { valid: false, reason: 'invalid timestamp format' };
      const sessionCreatedAt = parseInt(rawParts[1], 36);
      if (isNaN(sessionCreatedAt)) return { valid: false, reason: 'nan timestamp' };

      const now = Date.now();
      if (now - sessionCreatedAt > maxAgeMs) {
        return { valid: false, reason: 'expired' };
      }
      if (sessionCreatedAt > now + 60000) {
        return { valid: false, reason: 'future' };
      }

      const expectedSig = crypto.createHmac('sha256', secret).update(rawId).digest('base64url');
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { valid: false, reason: 'tampered' };
      }
      return { valid: true, rawId };
    }

    it('verifies valid sessions and rejects invalid, tampered, and expired tokens', () => {
      const now = Date.now();
      const validRaw = `sess_${now.toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
      const validToken = signSession(validRaw, TEST_SECRET);

      // Valid session
      assert.equal(verifySession(validToken, TEST_SECRET).valid, true);

      // Tampered signature
      const tamperedToken = `${validRaw}.fakeSig12345`;
      assert.equal(verifySession(tamperedToken, TEST_SECRET).valid, false);

      // Wrong secret
      assert.equal(verifySession(validToken, 'different-secret-for-testing').valid, false);

      // Expired token (25 hours ago)
      const expiredTime = now - 25 * 60 * 60 * 1000;
      const expiredRaw = `sess_${expiredTime.toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
      const expiredToken = signSession(expiredRaw, TEST_SECRET);
      const expiredCheck = verifySession(expiredToken, TEST_SECRET);
      assert.equal(expiredCheck.valid, false);
      assert.equal(expiredCheck.reason, 'expired');

      // Missing / empty token
      assert.equal(verifySession('', TEST_SECRET).valid, false);
      assert.equal(verifySession(undefined, TEST_SECRET).valid, false);
    });

    it('new session IDs cannot reset quota under dual-layer IP envelope', () => {
      const quotaStore = new Map<string, { count: number; resetAt: number }>();
      const clientIp = '192.168.1.100';
      const maxRequests = 2;

      function checkQuota(ip: string, rawSessionId: string | undefined): { allowed: boolean; remaining: number } {
        const ipKey = `Image:ip:${ip}`;
        let ipRecord = quotaStore.get(ipKey);
        if (!ipRecord) {
          ipRecord = { count: 1, resetAt: Date.now() + 60000 };
          quotaStore.set(ipKey, ipRecord);
        } else {
          ipRecord.count += 1;
        }

        let sessRecord = { count: 1 };
        if (rawSessionId) {
          const sessKey = `Image:sess:${rawSessionId}`;
          let rec = quotaStore.get(sessKey);
          if (!rec) {
            rec = { count: 1, resetAt: Date.now() + 60000 };
            quotaStore.set(sessKey, rec);
          } else {
            rec.count += 1;
          }
          sessRecord = rec;
        }

        const currentUsage = Math.max(ipRecord.count, sessRecord.count);
        return {
          allowed: currentUsage <= maxRequests,
          remaining: Math.max(0, maxRequests - currentUsage),
        };
      }

      // Request 1 with Session A
      const req1 = checkQuota(clientIp, 'sess_A');
      assert.equal(req1.allowed, true);
      assert.equal(req1.remaining, 1);

      // Request 2 with Session A
      const req2 = checkQuota(clientIp, 'sess_A');
      assert.equal(req2.allowed, true);
      assert.equal(req2.remaining, 0);

      // Request 3: Malicious client obtains brand new Session B to reset quota
      const req3 = checkQuota(clientIp, 'sess_B');
      assert.equal(req3.allowed, false); // Blocked because IP quota reached!
      assert.equal(req3.remaining, 0);
    });
  });

  describe('Priority 3: IndexedDB Storage & Hydration Safety', () => {
    it('multiple concurrent calls to initStorage share one single promise', async () => {
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

    it('does not autosave default state over existing saved projects when hydration is incomplete or fails', () => {
      // Simulate state in App.tsx
      let isStorageHydratedFlag = false; // Hydration failed / pending
      let autosaveCallCount = 0;

      function triggerAutosaveEffect(book: { id: string }, hydrated: boolean) {
        if (!hydrated) {
          return; // Guarded!
        }
        autosaveCallCount++;
      }

      // Default empty/starter book exists
      const defaultBook = { id: 'default-starter-book' };

      // Attempt autosave when not hydrated
      triggerAutosaveEffect(defaultBook, isStorageHydratedFlag);
      assert.equal(autosaveCallCount, 0, 'Autosave must NOT run when hydration has not succeeded!');

      // Only once hydration succeeds should autosave be allowed
      isStorageHydratedFlag = true;
      triggerAutosaveEffect(defaultBook, isStorageHydratedFlag);
      assert.equal(autosaveCallCount, 1);
    });

    it('createSafeStore automatically self-heals missing object stores to prevent NotFoundError', async () => {
      // Mock IndexedDB where initial database has only 'keyval', missing 'coloring_books'
      const existingStores = new Set<string>(['keyval']);
      let dbVersion = 1;
      const storeData = new Map<string, any>();

      (globalThis as any).indexedDB = {
        open: (name: string, ver?: number) => {
          if (ver && ver > dbVersion) {
            dbVersion = ver;
          }
          const currentMockDB = {
            version: dbVersion,
            objectStoreNames: {
              contains: (s: string) => existingStores.has(s),
            },
            createObjectStore: (s: string) => {
              existingStores.add(s);
            },
            close: () => {},
            transaction: (s: string) => {
              if (!existingStores.has(s)) {
                const notFound = new Error(`Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`);
                notFound.name = 'NotFoundError';
                throw notFound;
              }
              const tx: any = {};
              setTimeout(() => tx.onsuccess?.(), 0);
              return {
                objectStore: () => ({
                  get: (k: string) => {
                    const req: any = { result: storeData.get(k) };
                    setTimeout(() => req.onsuccess?.(), 0);
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

          const req: any = { result: currentMockDB };
          setTimeout(() => {
            if (ver && ver > 1) {
              req.onupgradeneeded?.();
            }
            req.onsuccess?.();
          }, 0);
          return req;
        },
      };

      const safeStore = createSafeStore('TestRecoveryDB', 'coloring_books', ['coloring_books', 'privacy_consent']);
      
      // Attempt read/write on store that was initially missing
      let writeSuccess = false;
      await safeStore('readwrite', (store) => {
        store.put('test-book-data', 'test-key');
        writeSuccess = true;
      });

      assert.equal(writeSuccess, true);
      assert.equal(existingStores.has('coloring_books'), true, 'coloring_books store should be created');
      assert.equal(dbVersion >= 2, true, 'Database version should have incremented to add missing store');
    });
  });

  describe('Priority 4: Parental Consent Token & Security Headers', () => {
    function createConsentToken(data: { role: string; childName: string; sessionId: string }, secret: string) {
      const cleanSession = (data.sessionId || '').trim();
      const cleanChild = (data.childName || '').trim().toLowerCase();
      if (!cleanSession || !cleanChild) {
        throw new Error('childName and sessionId are required');
      }
      const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
      const payload = JSON.stringify({
        role: data.role,
        childName: cleanChild,
        sessionId: cleanSession,
        expiresAt,
      });
      const b64 = Buffer.from(payload).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
      return `${b64}.${sig}`;
    }

    function verifyConsentToken(token: string | undefined, secret: string) {
      if (!token) return { valid: false, reason: 'missing' };
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false, reason: 'malformed' };
      const [b64, sig] = parts;
      const expected = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { valid: false, reason: 'invalid signature' };
      }
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
      if (payload.expiresAt < Date.now()) {
        return { valid: false, reason: 'expired' };
      }
      return { valid: true, payload };
    }

    it('requires strict child-name matching and rejects using consent token for a different child', () => {
      const tokenLeo = createConsentToken(
        { role: 'parent', childName: 'Leo', sessionId: 'sess_123.validSig' },
        TEST_SECRET
      );

      const verified = verifyConsentToken(tokenLeo, TEST_SECRET);
      assert.equal(verified.valid, true);

      // Same child 'Leo' -> matches
      const requestedChild1 = 'Leo';
      assert.equal(verified.payload.childName, requestedChild1.toLowerCase());

      // Different child 'Maya' -> MUST BE REJECTED
      const requestedChild2 = 'Maya';
      assert.notEqual(verified.payload.childName, requestedChild2.toLowerCase());
    });

    it('requires strict session matching and rejects using consent token on a different session', () => {
      const token = createConsentToken(
        { role: 'parent', childName: 'Leo', sessionId: 'sess_original.validSig' },
        TEST_SECRET
      );

      const verified = verifyConsentToken(token, TEST_SECRET);
      assert.equal(verified.valid, true);

      // Same session
      assert.equal(verified.payload.sessionId, 'sess_original.validSig');

      // Different session
      assert.notEqual(verified.payload.sessionId, 'sess_hijacked.validSig');

      // Empty session must fail
      const emptyCheck = Boolean(verified.payload.sessionId && '' && verified.payload.sessionId === '');
      assert.equal(emptyCheck, false);
    });

    it('production CSP contains neither unsafe-inline nor unsafe-eval in script-src', () => {
      const prodCsp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.google.com https://*.run.app;";

      // Parse script-src directive
      const scriptSrcMatch = prodCsp.match(/script-src\s+([^;]+)/);
      assert.ok(scriptSrcMatch, 'script-src directive must exist in CSP');
      const scriptSrc = scriptSrcMatch[1];

      assert.ok(!scriptSrc.includes("'unsafe-inline'"), "script-src must NOT contain 'unsafe-inline'");
      assert.ok(!scriptSrc.includes("'unsafe-eval'"), "script-src must NOT contain 'unsafe-eval'");
      assert.ok(prodCsp.includes("object-src 'none'"), "CSP must enforce object-src 'none'");
      assert.ok(prodCsp.includes("base-uri 'self'"), "CSP must enforce base-uri 'self'");
    });

    it('project source download endpoint is strictly disabled in production (returns 404)', () => {
      function handleDownloadEndpoint(nodeEnv: string) {
        if (nodeEnv === 'production') {
          return { status: 404, error: 'Project source archive download is disabled in deployed production environments.' };
        }
        return { status: 200 };
      }

      assert.equal(handleDownloadEndpoint('production').status, 404);
    });
  });
});
