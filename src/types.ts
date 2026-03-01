import { TFile } from "obsidian";

export type NoteType = "inbox" | "daily" | "permanent" | "literature" | "unknown";
export type Maturity = "Seed" | "Sprout" | "Evergreen" | "Dead";

export type DiagnosisLevel = "healthy" | "info" | "warning" | "critical" | "skip";
export type Tone = "gentle" | "neutral" | "strict";
export type InboxStaleBasis = "creation" | "modified";
export type Lang = "en" | "ja";
export type LangSetting = "auto" | Lang;

/** View type identifier for the Knowledge Gardener Dashboard */
export const VIEW_TYPE_KG_DASHBOARD = "knowledge-gardener-dashboard";

export interface NextAction {
    description: string;
    why: string;
    effort: "small" | "medium" | "large";
}

export interface Diagnosis {
    metric: "connectedness" | "inbox-staleness" | "maturity";
    level: DiagnosisLevel;
    message: string;
    nextAction?: NextAction;
}

export interface KnowledgeGardenerSettings {
    seedMinChars: number;
    deadStaleDays: number;
    excludeFolders: string;
    inboxFolders: string;
    gracePeriodDays: number;
    inboxStaleDays: number;
    inboxStaleBasis: InboxStaleBasis;
    maxDailySuggestions: number;
    tone: Tone;
    language: LangSetting;
    enableEmoji: boolean;
    permanentFolder: string;
    literatureFolder: string;
    archiveFolder: string;
    cooldownDays: number;
}

export interface NoteStats {
    file: TFile;
    charCount: number;
    daysSinceUpdate: number;
    linkCount: number;
    quoteRatio: number;
}

export interface NoteDiagnosis extends NoteStats {
    noteType: NoteType;
    maturity: Maturity;
    backlinkCount: number;
    daysSinceCreation: number;
    diagnoses: Diagnosis[];
}

/** 処方箋表示用：ノート＋最優先の診断 */
export interface PrescriptionItem {
    noteDiagnosis: NoteDiagnosis;
    topDiagnosis: Diagnosis;
    priority: number;
}

export interface GardenReport {
    totalFiles: number;
    excludedFiles: number;
    scannedFiles: number;
    skippedFiles: number;
    erroredFiles: number;
    orphanCount: number;
    staleInboxCount: number;
    diagnoses: NoteDiagnosis[];
    maturityCounts: Record<Maturity, number>;
    /** Number of files served from the incremental scan cache */
    cachedFiles: number;
}

/* ================================================================
 *  Incremental scan cache
 * ================================================================ */

/** In-memory cache entry for a single scanned file */
export interface ScanCacheEntry {
    /** file.stat.mtime at the time of caching */
    mtime: number;
    /** The full cached diagnosis result */
    noteDiagnosis: NoteDiagnosis;
}

/** In-memory scan cache, keyed by file.path */
export type ScanCache = Map<string, ScanCacheEntry>;

/* ================================================================
 *  Prescription history
 *
 *  Maps file paths to the timestamp (ms) when they were last
 *  shown in the daily prescription modal.  Used to enforce a
 *  cooldown period so that the same notes are not suggested
 *  repeatedly.
 *
 *  Persisted alongside settings in the plugin data blob but
 *  kept separate from KnowledgeGardenerSettings to avoid
 *  polluting the settings fingerprint used for scan-cache
 *  invalidation.
 * ================================================================ */

/** filepath → last-suggested timestamp (ms since epoch) */
export type PrescriptionHistory = Record<string, number>;