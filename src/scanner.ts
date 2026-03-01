import { App } from "obsidian";
import {
    Diagnosis,
    GardenReport,
    KnowledgeGardenerSettings,
    Maturity,
    NoteDiagnosis,
    NoteStats,
    ScanCache,
} from "./types";
import {
    classifyNote,
    parseFolderList,
    pathStartsWithFolder,
} from "./classifier";
import { assessMaturity } from "./maturity";
import {
    buildBacklinkIndex,
    diagnoseConnectedness,
    diagnoseInboxStaleness,
    diagnoseMaturity,
    getBacklinkCountFiltered,
    getOutLinkCountFiltered,
    shouldSkipNote,
} from "./diagnose";
import { resolveLang } from "./i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

// [WARMUP] プラグイン起動後、この期間内はキャッシュ未温まりとみなし
// 被リンク API が 0 でも index > 0 なら index を採用する
const WARMUP_MS = 60_000; // 60秒

/**
 * 本文から引用率を計算（行ベース）
 */
function calculateQuoteRatio(content: string): number {
    const lines = content.split("\n");
    if (lines.length === 0) return 0;

    const quoteLines = lines.filter((line) =>
        line.trimStart().startsWith(">")
    ).length;
    return quoteLines / lines.length;
}

/**
 * Vault 全体をスキャンしてレポートを生成
 *
 * Unchanged files (same mtime) are served from `scanCache` to avoid
 * expensive `cachedRead` calls and redundant diagnosis computation.
 *
 * @param app        Obsidian App インスタンス
 * @param settings   プラグイン設定
 * @param startedAt  プラグインの起動時刻（Date.now()）。キャッシュ未温まり判定に使用
 * @param scanCache  In-memory scan cache (mutated in place)
 */
export async function scanVault(
    app: App,
    settings: KnowledgeGardenerSettings,
    startedAt: number,
    scanCache: ScanCache
): Promise<GardenReport> {
    const now = Date.now();
    const files = app.vault.getMarkdownFiles();
    const lang = resolveLang(settings.language);
    const emoji = settings.enableEmoji;

    // [WARMUP] 起動後 WARMUP_MS 以内ならキャッシュ未温まり期間
    const isWarmup = now - startedAt < WARMUP_MS;

    const excludedFolders = parseFolderList(settings.excludeFolders);
    const inboxFolders = parseFolderList(settings.inboxFolders);

    const report: GardenReport = {
        totalFiles: files.length,
        excludedFiles: 0,
        scannedFiles: 0,
        skippedFiles: 0,
        erroredFiles: 0,
        orphanCount: 0,
        staleInboxCount: 0,
        diagnoses: [],
        maturityCounts: {
            Seed: 0,
            Sprout: 0,
            Evergreen: 0,
            Dead: 0,
        },
        cachedFiles: 0,
    };

    const backlinkIndex = buildBacklinkIndex(app, excludedFolders);

    for (const file of files) {
        if (pathStartsWithFolder(file.path, excludedFolders)) {
            report.excludedFiles++;
            continue;
        }

        try {
            const metaCache = app.metadataCache.getFileCache(file);
            const frontmatter = metaCache?.frontmatter;
            const noteType = classifyNote(file, frontmatter, inboxFolders);

            if (
                shouldSkipNote(file, noteType, frontmatter, settings, now)
            ) {
                report.skippedFiles++;
                continue;
            }

            /* ============================================================
             *  Incremental cache check
             *
             *  If the file's mtime has not changed since we last computed
             *  its NoteDiagnosis, reuse the cached result.  This avoids
             *  the most expensive operations: cachedRead, backlink
             *  resolution, and diagnosis construction.
             * ============================================================ */
            const cached = scanCache.get(file.path);
            if (cached && cached.mtime === file.stat.mtime) {
                // Shallow-copy with a fresh TFile reference
                const nd: NoteDiagnosis = {
                    ...cached.noteDiagnosis,
                    file,
                };

                // Update report counters from cached data
                if (nd.noteType !== "inbox" && nd.noteType !== "daily") {
                    report.maturityCounts[nd.maturity]++;
                }
                for (const d of nd.diagnoses) {
                    if (
                        d.metric === "connectedness" &&
                        d.level === "critical"
                    ) {
                        report.orphanCount++;
                    }
                    if (
                        d.metric === "inbox-staleness" &&
                        d.level === "critical"
                    ) {
                        report.staleInboxCount++;
                    }
                }

                report.diagnoses.push(nd);
                report.scannedFiles++;
                report.cachedFiles++;
                continue;
            }

            /* ============================================================
             *  Full computation (cache miss)
             * ============================================================ */
            const daysSinceCreation = Math.floor(
                (now - file.stat.ctime) / DAY_MS
            );
            const daysSinceUpdate = Math.floor(
                (now - file.stat.mtime) / DAY_MS
            );

            // Inbox 滞留日数の計算基準を設定に応じて選択
            const daysForInboxStaleness =
                settings.inboxStaleBasis === "creation"
                    ? daysSinceCreation
                    : daysSinceUpdate;

            // [WARMUP] isWarmup を渡す
            const backlinkCount = getBacklinkCountFiltered(
                app,
                file,
                excludedFolders,
                backlinkIndex,
                isWarmup
            );

            const outLinks = getOutLinkCountFiltered(
                app,
                file,
                excludedFolders
            );

            const content = await app.vault.cachedRead(file);
            const charCount = content.length;
            const quoteRatio = calculateQuoteRatio(content);

            const stats: NoteStats = {
                file,
                charCount,
                daysSinceUpdate,
                linkCount: outLinks,
                quoteRatio,
            };

            const maturity: Maturity = assessMaturity(stats, settings);

            const diagnoses: Diagnosis[] = [];

            const connectedness = diagnoseConnectedness(
                noteType,
                outLinks,
                backlinkCount,
                settings.tone,
                lang,
                emoji
            );
            diagnoses.push(connectedness);

            const inboxStaleness = diagnoseInboxStaleness(
                noteType,
                daysForInboxStaleness,
                settings,
                lang,
                emoji
            );
            diagnoses.push(inboxStaleness);

            const maturityDiag = diagnoseMaturity(
                maturity,
                settings.tone,
                noteType,
                lang,
                emoji
            );
            diagnoses.push(maturityDiag);

            if (noteType !== "inbox" && noteType !== "daily") {
                report.maturityCounts[maturity]++;
            }

            if (connectedness.level === "critical") {
                report.orphanCount++;
            }

            if (inboxStaleness.level === "critical") {
                report.staleInboxCount++;
            }

            const noteDiagnosis: NoteDiagnosis = {
                ...stats,
                noteType,
                maturity,
                backlinkCount,
                daysSinceCreation,
                diagnoses,
            };

            report.diagnoses.push(noteDiagnosis);
            report.scannedFiles++;

            // Store in cache for future scans
            scanCache.set(file.path, {
                mtime: file.stat.mtime,
                noteDiagnosis,
            });
        } catch (error) {
            report.erroredFiles++;
            console.warn(
                `[Knowledge Gardener] Error processing ${file.path}:`,
                error
            );
        }
    }

    // Prune cache entries for deleted or renamed files
    const activePaths = new Set(files.map((f) => f.path));
    for (const cachedPath of scanCache.keys()) {
        if (!activePaths.has(cachedPath)) {
            scanCache.delete(cachedPath);
        }
    }

    return report;
}