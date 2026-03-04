import { Notice, Plugin } from "obsidian";
import {
    GardenReport,
    KnowledgeGardenerSettings,
    Lang,
    PrescriptionHistory,
    PrescriptionItem,
    ScanCache,
    VIEW_TYPE_KG_DASHBOARD,
} from "./types";
import { DEFAULT_SETTINGS, KnowledgeGardenerSettingTab } from "./settings";
import { scanVault } from "./scanner";
import { getPrescriptionPriority } from "./diagnose";
import { PrescriptionModal } from "./modal";
import { KGDashboardView } from "./view";
import { resolveLang, t } from "./i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

export default class KnowledgeGardenerPlugin extends Plugin {
    settings!: KnowledgeGardenerSettings;

    // [WARMUP] プラグインのロード時刻を保持
    //          キャッシュ未温まり判定に使用（起動後60秒以内はwarmup扱い）
    private startedAt = Date.now();

    /** In-memory scan cache: avoids re-reading unchanged files */
    private scanCache: ScanCache = new Map();

    /**
     * JSON fingerprint of settings at last scan.
     * When settings change the entire cache is invalidated automatically.
     * Note: prescriptionHistory is NOT included in the fingerprint
     * because it does not affect scan results.
     */
    private settingsFingerprint = "";

    /**
     * Prescription history: filepath → last-suggested timestamp.
     * Persisted alongside settings in the plugin data blob.
     * Kept separate from KnowledgeGardenerSettings to avoid
     * polluting the settings fingerprint.
     */
    private prescriptionHistory: PrescriptionHistory = {};

    async onload() {
        // [WARMUP] onload 時点の時刻を記録
        this.startedAt = Date.now();

        await this.loadSettings();

        const lang = this.getLang();
        const emoji = this.settings.enableEmoji;

        this.addSettingTab(new KnowledgeGardenerSettingTab(this.app, this));

        // ── Free commands (always registered) ──────────────────────

        // 【修正2,3】callback は void を返す関数が期待されるため、
        //  async 関数の戻り値 (Promise) を void で明示的に無視する
        this.addCommand({
            id: "scan-vault",
            name: t(lang, "command.scanVault", undefined, emoji),
            callback: () => {
                void this.runScan();
            },
        });

        this.addCommand({
            id: "daily-prescription",
            name: t(lang, "command.dailyPrescription", undefined, emoji),
            callback: () => {
                void this.showDailyPrescription();
            },
        });

        // Ribbon: prescription modal
        this.addRibbonIcon(
            "heart-pulse",
            t(lang, "ribbon.tooltip", undefined, emoji),
            () => {
                void this.showDailyPrescription();
            }
        );

        // ── Pro commands & views (entire block removed in Free) ────

        if (IS_PRO) {
            this.registerView(
                VIEW_TYPE_KG_DASHBOARD,
                (leaf) => new KGDashboardView(leaf, this)
            );

            this.addCommand({
                id: "reset-scan-cache",
                name: "Reset scan cache",
                callback: () => this.resetScanCache(),
            });

            this.addCommand({
                id: "open-dashboard",
                name: "Open dashboard",
                callback: () => {
                    void this.openDashboard();
                },
            });

            this.addCommand({
                id: "clear-prescription-history",
                name: "Clear prescription history",
                callback: () => this.clearPrescriptionHistory(),
            });

            this.addRibbonIcon(
                "layout-dashboard",
                "Knowledge Gardener Dashboard",
                () => {
                    void this.openDashboard();
                }
            );
        }
    }

    onunload() {
        if (IS_PRO) {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_KG_DASHBOARD);
        }
    }

    /* ================================================================
     *  Settings & data persistence
     *
     *  The persisted data blob contains all KnowledgeGardenerSettings
     *  keys plus an additional `prescriptionHistory` key.  On load we
     *  separate them; on save we merge them back.
     * ================================================================ */

    async loadSettings() {
        // 【修正1】any → unknown に変更し、eslint-disable コメントを削除。
        //  型安全に Record<string, unknown> へ narrowing する。
        const raw: unknown = await this.loadData();
        const data: Record<string, unknown> =
            raw != null && typeof raw === "object" && !Array.isArray(raw)
                ? (raw as Record<string, unknown>)
                : {};

        // Extract prescription history before merging into settings
        this.prescriptionHistory = {};
        if (IS_PRO) {
            const rawHistory: unknown = data.prescriptionHistory;
            if (
                rawHistory != null &&
                typeof rawHistory === "object" &&
                !Array.isArray(rawHistory)
            ) {
                this.prescriptionHistory =
                    rawHistory as PrescriptionHistory;
            }
        }
        // Remove history key so it doesn't leak into settings
        delete data.prescriptionHistory;

        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            data
        ) as KnowledgeGardenerSettings;
    }

    async saveSettings() {
        if (IS_PRO) {
            await this.saveData({
                ...this.settings,
                prescriptionHistory: this.prescriptionHistory,
            });
        } else {
            await this.saveData(this.settings);
        }
    }

    getLang(): Lang {
        return resolveLang(this.settings.language);
    }

    /* ================================================================
     *  Incremental scan cache helpers
     * ================================================================ */

    resetScanCache(): void {
        const size = this.scanCache.size;
        this.scanCache.clear();
        this.settingsFingerprint = "";
        new Notice(
            size > 0
                ? `Scan cache cleared (${size} entries).`
                : "Scan cache is already empty."
        );
    }

    private invalidateCacheIfSettingsChanged(): void {
        // prescriptionHistory is NOT part of settings, so changing
        // history alone does not invalidate the scan cache.
        const fingerprint = JSON.stringify(this.settings);
        if (fingerprint !== this.settingsFingerprint) {
            this.scanCache.clear();
            this.settingsFingerprint = fingerprint;
        }
    }

    /* ================================================================
     *  Prescription history (Pro only — methods are tree-shaken
     *  from the Free build because they are only called inside
     *  `if (IS_PRO)` guards)
     * ================================================================ */

    /** Number of entries in the prescription history. */
    getHistoryCount(): number {
        return Object.keys(this.prescriptionHistory).length;
    }

    /**
     * Record that the given prescriptions were shown to the user.
     * Updates timestamps and persists asynchronously.
     */
    recordSuggestions(items: PrescriptionItem[]): void {
        const now = Date.now();
        for (const item of items) {
            this.prescriptionHistory[item.noteDiagnosis.file.path] = now;
        }
        this.pruneHistory();
        // Fire-and-forget save — acceptable for history data
        void this.saveSettings();
    }

    /**
     * Clear all prescription history entries.
     * Called from the settings UI or from a command.
     */
    clearPrescriptionHistory(): void {
        const count = Object.keys(this.prescriptionHistory).length;
        this.prescriptionHistory = {};
        void this.saveSettings();
        new Notice(
            count > 0
                ? `Prescription history cleared (${count} entries).`
                : "Prescription history is already empty."
        );
    }

    /**
     * Remove history entries older than 2× cooldownDays.
     * Called automatically when recording new suggestions.
     */
    private pruneHistory(): void {
        const now = Date.now();
        const maxAge = this.settings.cooldownDays * 2 * DAY_MS;
        if (maxAge <= 0) {
            // cooldownDays is 0 → no pruning needed, but also no
            // reason to keep history — clear it.
            this.prescriptionHistory = {};
            return;
        }
        const pruned: PrescriptionHistory = {};
        for (const [filePath, timestamp] of Object.entries(
            this.prescriptionHistory
        )) {
            if (now - timestamp <= maxAge) {
                pruned[filePath] = timestamp;
            }
        }
        this.prescriptionHistory = pruned;
    }

    /* ================================================================
     *  Core scan (shared by commands, modal, and dashboard)
     * ================================================================ */

    async performScan(): Promise<GardenReport> {
        this.invalidateCacheIfSettingsChanged();
        return scanVault(
            this.app,
            this.settings,
            this.startedAt,
            this.scanCache
        );
    }

    /* ================================================================
     *  Commands
     * ================================================================ */

    async runScan(): Promise<GardenReport> {
        const lang = this.getLang();
        const emoji = this.settings.enableEmoji;
        new Notice(t(lang, "notice.scanning", undefined, emoji));
        const report = await this.performScan();
        this.showScanSummary(report);
        return report;
    }

    showScanSummary(report: GardenReport) {
        const lang = this.getLang();
        const emoji = this.settings.enableEmoji;
        const { maturityCounts, orphanCount, staleInboxCount } = report;

        const lines: string[] = [
            t(lang, "notice.scanResult", undefined, emoji),
            "",
            t(lang, "notice.totalFiles", { count: report.totalFiles }, emoji),
            t(
                lang,
                "notice.excluded",
                { count: report.excludedFiles },
                emoji
            ),
            t(
                lang,
                "notice.skipped",
                { count: report.skippedFiles },
                emoji
            ),
            t(
                lang,
                "notice.scanned",
                { count: report.scannedFiles },
                emoji
            ),
            report.cachedFiles > 0
                ? `  Cached: ${report.cachedFiles}`
                : "",
            report.erroredFiles > 0
                ? t(
                      lang,
                      "notice.errored",
                      { count: report.erroredFiles },
                      emoji
                  )
                : "",
            "",
            t(lang, "notice.maturitySection", undefined, emoji),
            t(lang, "notice.seed", { count: maturityCounts.Seed }, emoji),
            t(
                lang,
                "notice.sprout",
                { count: maturityCounts.Sprout },
                emoji
            ),
            t(
                lang,
                "notice.evergreen",
                { count: maturityCounts.Evergreen },
                emoji
            ),
            t(lang, "notice.dead", { count: maturityCounts.Dead }, emoji),
            "",
            t(lang, "notice.orphans", { count: orphanCount }, emoji),
            t(lang, "notice.staleInbox", { count: staleInboxCount }, emoji),
        ].filter((l) => l !== "");

        new Notice(lines.join("\n"), 10000);
    }

    async showDailyPrescription() {
        const lang = this.getLang();
        const emoji = this.settings.enableEmoji;
        new Notice(t(lang, "notice.diagnosing", undefined, emoji), 2000);

        const report = await this.performScan();

        // Pro: apply cooldown filter.  Free: show all eligible.
        const applyCooldown = IS_PRO;
        const prescriptions = this.buildPrescriptions(report, applyCooldown);

        const limitedPrescriptions = prescriptions.slice(
            0,
            this.settings.maxDailySuggestions
        );

        // Pro: record that these notes were shown
        if (IS_PRO) {
            this.recordSuggestions(limitedPrescriptions);
        }

        const modal = new PrescriptionModal(
            this.app,
            limitedPrescriptions,
            lang,
            emoji,
            this.settings
        );
        modal.open();
    }

    /* ================================================================
     *  Dashboard (Pro only — this method and KGDashboardView import
     *  are tree-shaken from the Free build because they are only
     *  called inside `if (IS_PRO)` guards in onload())
     * ================================================================ */

    async openDashboard(): Promise<void> {
        const existing = this.app.workspace.getLeavesOfType(
            VIEW_TYPE_KG_DASHBOARD
        );

        const firstExisting = existing[0];
        if (firstExisting) {
            this.app.workspace.revealLeaf(firstExisting);
            const view = firstExisting.view;
            if (view instanceof KGDashboardView) {
                await view.refresh();
            }
            return;
        }

        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({
            type: VIEW_TYPE_KG_DASHBOARD,
            active: true,
        });
        this.app.workspace.revealLeaf(leaf);
    }

    /* ================================================================
     *  Prescription builder
     *
     *  @param report        The scan report to build prescriptions from.
     *  @param applyCooldown When true, notes that were recently shown
     *                       (within cooldownDays) are excluded.
     *                       The dashboard passes false; the daily
     *                       prescription modal passes true (Pro only).
     * ================================================================ */

    buildPrescriptions(
        report: GardenReport,
        applyCooldown = false
    ): PrescriptionItem[] {
        const now = Date.now();
        const cooldownMs = this.settings.cooldownDays * DAY_MS;
        const items: PrescriptionItem[] = [];

        for (const nd of report.diagnoses) {
            // If cooldown is active and this note was recently suggested, skip
            if (applyCooldown && cooldownMs > 0) {
                const lastSuggested =
                    this.prescriptionHistory[nd.file.path];
                if (
                    lastSuggested !== undefined &&
                    now - lastSuggested < cooldownMs
                ) {
                    continue;
                }
            }

            const actionableDiagnoses = nd.diagnoses
                .filter(
                    (d) =>
                        d.level !== "healthy" &&
                        d.level !== "skip" &&
                        d.nextAction
                )
                .map((d) => ({
                    diagnosis: d,
                    priority: getPrescriptionPriority(d),
                }))
                .sort((a, b) => a.priority - b.priority);

            const top = actionableDiagnoses[0];
            if (top) {
                items.push({
                    noteDiagnosis: nd,
                    topDiagnosis: top.diagnosis,
                    priority: top.priority,
                });
            }
        }

        return items.sort((a, b) => a.priority - b.priority);
    }
}