import fs from 'fs';
import path from 'path';

export type PdfExportType = 'full-book' | 'single-page' | 'direct-print' | string;
export type RegenerationType = 'page' | 'cover' | 'stickers' | 'batch' | string;

export interface DailyUsageRecord {
  date: string; // 'YYYY-MM-DD'
  pdfExports: number;
  regenerations: number;
  breakdown: {
    pdfExports: {
      fullBook: number;
      singlePage: number;
      directPrint: number;
      other: number;
    };
    regenerations: {
      page: number;
      cover: number;
      stickers: number;
      batch: number;
      other: number;
    };
  };
  lastUpdated: string;
}

export interface UsageStoreData {
  version: number;
  createdAt: string;
  updatedAt: string;
  totalPdfExports: number;
  totalRegenerations: number;
  daily: Record<string, DailyUsageRecord>;
}

export interface UsageTrendsSummary {
  totalPdfExports: number;
  totalRegenerations: number;
  activeDaysTracked: number;
  averageDailyPdfExports: number;
  averageDailyRegenerations: number;
  peakPdfExportDay: { date: string; count: number } | null;
  peakRegenerationDay: { date: string; count: number } | null;
  recentTrends: DailyUsageRecord[];
}

export const DEFAULT_USAGE_LOG_FILE =
  process.env.USAGE_LOG_PATH || path.join(process.cwd(), '.usage-trends.json');

/**
 * Returns today's date formatted as YYYY-MM-DD in UTC / local ISO date
 */
export function getFormattedDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyDailyRecord(dateStr: string): DailyUsageRecord {
  return {
    date: dateStr,
    pdfExports: 0,
    regenerations: 0,
    breakdown: {
      pdfExports: {
        fullBook: 0,
        singlePage: 0,
        directPrint: 0,
        other: 0,
      },
      regenerations: {
        page: 0,
        cover: 0,
        stickers: 0,
        batch: 0,
        other: 0,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

function createInitialStoreData(): UsageStoreData {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    totalPdfExports: 0,
    totalRegenerations: 0,
    daily: {},
  };
}

/**
 * PersistentUsageLogger
 *
 * Tracks daily PDF export counts and user-triggered regenerations in a simple persistent JSON file.
 * Uses atomic file replacement (temp file + rename) to guarantee state integrity across server restarts.
 */
export class PersistentUsageLogger {
  private filePath: string;
  private state: UsageStoreData;
  private isLoaded = false;

  constructor(filePath: string = DEFAULT_USAGE_LOG_FILE) {
    this.filePath = filePath;
    this.state = createInitialStoreData();
    this.reload();
  }

  public getFilePath(): string {
    return this.filePath;
  }

  public setFilePathForTesting(newPath: string): void {
    this.filePath = newPath;
    this.reload();
  }

  public reload(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.state = createInitialStoreData();
        this.isLoaded = true;
        return;
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw || !raw.trim()) {
        this.state = createInitialStoreData();
        this.isLoaded = true;
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.daily && typeof parsed.daily === 'object') {
        this.state = {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          totalPdfExports: typeof parsed.totalPdfExports === 'number' ? parsed.totalPdfExports : 0,
          totalRegenerations: typeof parsed.totalRegenerations === 'number' ? parsed.totalRegenerations : 0,
          daily: parsed.daily,
        };
      } else {
        this.state = createInitialStoreData();
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn(`[UsageLogger] Failed to read ${this.filePath}, initializing fresh store:`, err);
      this.state = createInitialStoreData();
      this.isLoaded = true;
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.state.updatedAt = new Date().toISOString();
      const payload = JSON.stringify(this.state, null, 2);

      // Atomic write pattern: write to PID-timestamp temp file first, then renameSync
      const tempPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
      fs.writeFileSync(tempPath, payload, 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error(`[UsageLogger] Atomic persist failed for ${this.filePath}:`, err);
      throw err;
    }
  }

  private ensureDailyRecord(dateStr: string): DailyUsageRecord {
    if (!this.state.daily[dateStr]) {
      this.state.daily[dateStr] = createEmptyDailyRecord(dateStr);
    }
    const rec = this.state.daily[dateStr];
    // Ensure breakdown objects exist for forwards-compatibility
    if (!rec.breakdown) {
      rec.breakdown = createEmptyDailyRecord(dateStr).breakdown;
    }
    if (!rec.breakdown.pdfExports) {
      rec.breakdown.pdfExports = { fullBook: 0, singlePage: 0, directPrint: 0, other: 0 };
    }
    if (!rec.breakdown.regenerations) {
      rec.breakdown.regenerations = { page: 0, cover: 0, stickers: 0, batch: 0, other: 0 };
    }
    return rec;
  }

  /**
   * Tracks a user PDF export event
   */
  public recordPdfExport(
    exportType: PdfExportType = 'full-book',
    targetDate?: string
  ): DailyUsageRecord {
    const dateStr = targetDate || getFormattedDate();
    const rec = this.ensureDailyRecord(dateStr);

    rec.pdfExports += 1;
    this.state.totalPdfExports += 1;

    switch (exportType) {
      case 'full-book':
        rec.breakdown.pdfExports.fullBook += 1;
        break;
      case 'single-page':
        rec.breakdown.pdfExports.singlePage += 1;
        break;
      case 'direct-print':
        rec.breakdown.pdfExports.directPrint += 1;
        break;
      default:
        rec.breakdown.pdfExports.other += 1;
        break;
    }

    rec.lastUpdated = new Date().toISOString();
    this.persist();
    return JSON.parse(JSON.stringify(rec));
  }

  /**
   * Tracks a user-triggered regeneration event
   */
  public recordRegeneration(
    regenType: RegenerationType = 'page',
    targetDate?: string
  ): DailyUsageRecord {
    const dateStr = targetDate || getFormattedDate();
    const rec = this.ensureDailyRecord(dateStr);

    rec.regenerations += 1;
    this.state.totalRegenerations += 1;

    switch (regenType) {
      case 'page':
        rec.breakdown.regenerations.page += 1;
        break;
      case 'cover':
        rec.breakdown.regenerations.cover += 1;
        break;
      case 'stickers':
        rec.breakdown.regenerations.stickers += 1;
        break;
      case 'batch':
        rec.breakdown.regenerations.batch += 1;
        break;
      default:
        rec.breakdown.regenerations.other += 1;
        break;
    }

    rec.lastUpdated = new Date().toISOString();
    this.persist();
    return JSON.parse(JSON.stringify(rec));
  }

  /**
   * Retrieves usage record for a given date (defaults to today)
   */
  public getDailyUsage(dateStr?: string): DailyUsageRecord {
    const date = dateStr || getFormattedDate();
    const existing = this.state.daily[date];
    if (existing) {
      return JSON.parse(JSON.stringify(existing));
    }
    return createEmptyDailyRecord(date);
  }

  /**
   * Computes usage trends and averages across the past N days (or all recorded days)
   */
  public getUsageTrends(daysLimit: number = 30): UsageTrendsSummary {
    const dates = Object.keys(this.state.daily).sort();
    const selectedDates = daysLimit > 0 ? dates.slice(-daysLimit) : dates;

    const recentTrends: DailyUsageRecord[] = selectedDates.map((d) =>
      JSON.parse(JSON.stringify(this.state.daily[d]))
    );

    let peakPdfExportDay: { date: string; count: number } | null = null;
    let peakRegenerationDay: { date: string; count: number } | null = null;

    let periodPdfExports = 0;
    let periodRegenerations = 0;

    for (const item of recentTrends) {
      periodPdfExports += item.pdfExports;
      periodRegenerations += item.regenerations;

      if (!peakPdfExportDay || item.pdfExports > peakPdfExportDay.count) {
        peakPdfExportDay = { date: item.date, count: item.pdfExports };
      }

      if (!peakRegenerationDay || item.regenerations > peakRegenerationDay.count) {
        peakRegenerationDay = { date: item.date, count: item.regenerations };
      }
    }

    const activeDaysTracked = recentTrends.length;
    const avgDailyPdfExports =
      activeDaysTracked > 0 ? Number((periodPdfExports / activeDaysTracked).toFixed(2)) : 0;
    const avgDailyRegenerations =
      activeDaysTracked > 0 ? Number((periodRegenerations / activeDaysTracked).toFixed(2)) : 0;

    return {
      totalPdfExports: this.state.totalPdfExports,
      totalRegenerations: this.state.totalRegenerations,
      activeDaysTracked,
      averageDailyPdfExports: avgDailyPdfExports,
      averageDailyRegenerations: avgDailyRegenerations,
      peakPdfExportDay,
      peakRegenerationDay,
      recentTrends,
    };
  }

  /**
   * Returns complete underlying state
   */
  public getAllData(): UsageStoreData {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Resets usage state and removes persistent file (for testing)
   */
  public resetForTesting(): void {
    this.state = createInitialStoreData();
    if (fs.existsSync(this.filePath)) {
      try {
        fs.unlinkSync(this.filePath);
      } catch {}
    }
  }
}

// Global shared default instance
export const usageLogger = new PersistentUsageLogger();

export function recordPdfExport(exportType?: PdfExportType, targetDate?: string): DailyUsageRecord {
  return usageLogger.recordPdfExport(exportType, targetDate);
}

export function recordRegeneration(regenType?: RegenerationType, targetDate?: string): DailyUsageRecord {
  return usageLogger.recordRegeneration(regenType, targetDate);
}

export function getDailyUsage(dateStr?: string): DailyUsageRecord {
  return usageLogger.getDailyUsage(dateStr);
}

export function getUsageTrends(daysLimit?: number): UsageTrendsSummary {
  return usageLogger.getUsageTrends(daysLimit);
}

export function getUsageLogData(): UsageStoreData {
  return usageLogger.getAllData();
}
