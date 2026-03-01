import { App, TFile, FrontMatterCache } from "obsidian";
import {
    Diagnosis,
    KnowledgeGardenerSettings,
    Lang,
    Maturity,
    NoteType,
    Tone,
} from "./types";
import { pathStartsWithFolder } from "./classifier";
import { t } from "./i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ================================================================
 *  A.  安全弁
 * ================================================================ */

export function shouldSkipNote(
    file: TFile,
    noteType: NoteType,
    frontmatter: FrontMatterCache | undefined,
    settings: KnowledgeGardenerSettings,
    now: number
): boolean {
    if (noteType === "daily") return true;

    if (
        frontmatter &&
        typeof frontmatter["health-check"] === "string" &&
        frontmatter["health-check"].toLowerCase() === "skip"
    ) {
        return true;
    }

    if (noteType === "inbox") return false;

    const ageMs = now - file.stat.ctime;
    const gracePeriodMs = settings.gracePeriodDays * DAY_MS;
    if (ageMs < gracePeriodMs) return true;

    return false;
}

/* ================================================================
 *  B.  被リンクインデックスの事前構築（フォールバック用）
 * ================================================================ */

export function buildBacklinkIndex(
    app: App,
    excludedFolders: string[]
): Map<string, number> {
    const index = new Map<string, number>();
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaCache = app.metadataCache as any;
        const resolvedLinks:
            | Record<string, Record<string, number>>
            | undefined = metaCache.resolvedLinks;

        if (resolvedLinks && typeof resolvedLinks === "object") {
            for (const sourcePath of Object.keys(resolvedLinks)) {
                if (pathStartsWithFolder(sourcePath, excludedFolders)) {
                    continue;
                }
                const targets = resolvedLinks[sourcePath];
                if (targets && typeof targets === "object") {
                    for (const targetPath of Object.keys(targets)) {
                        index.set(
                            targetPath,
                            (index.get(targetPath) ?? 0) + 1
                        );
                    }
                }
            }
        }
    } catch (_e) {
        // 安全に空 Map を返す
    }
    return index;
}

/* ================================================================
 *  C.  被リンク数の取得（検閲付き）
 *
 *  [WARMUP] キャッシュ未温まり対策（起動後60秒以内のみ）:
 *
 *  ・API が > 0 → API（リアルタイム検閲済み）を信頼
 *  ・API が 0 かつ index も 0 → 0 確定
 *  ・API が 0 だが index > 0:
 *      - isWarmup === true  → index を採用（キャッシュ未温まりの可能性）
 *      - isWarmup === false → API の 0 を信頼（過大評価を防止）
 *  ・API が無効（valid === false）→ index フォールバック（常時）
 * ================================================================ */

interface BacklinkExtractionResult {
    valid: boolean;
    sources: string[];
}

function extractBacklinkData(backlinks: unknown): BacklinkExtractionResult {
    if (!backlinks || typeof backlinks !== "object") {
        return { valid: false, sources: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bl = backlinks as any;
    const data = bl.data;

    if (data === undefined || data === null) {
        return { valid: false, sources: [] };
    }

    if (data instanceof Map) {
        return { valid: true, sources: Array.from(data.keys()) };
    }

    if (typeof data === "object") {
        return { valid: true, sources: Object.keys(data) };
    }

    return { valid: false, sources: [] };
}

// [WARMUP] isWarmup 引数を追加
export function getBacklinkCountFiltered(
    app: App,
    file: TFile,
    excludedFolders: string[],
    backlinkIndex: Map<string, number>,
    isWarmup: boolean
): number {
    const idxCount = backlinkIndex.get(file.path) ?? 0;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaCache = app.metadataCache as any;
        if (typeof metaCache.getBacklinksForFile === "function") {
            const backlinks = metaCache.getBacklinksForFile(file);
            const result = extractBacklinkData(backlinks);

            if (result.valid) {
                const filtered = result.sources.filter(
                    (src) => !pathStartsWithFolder(src, excludedFolders)
                );
                if (filtered.length === 0 && idxCount > 0 && isWarmup) {
                    return idxCount;
                }
                return filtered.length;
            }
        }
    } catch (_e) {
        // フォールバックへ
    }

    return idxCount;
}

/* ================================================================
 *  D.  発リンク数の取得（除外フォルダへのリンクを検閲）
 *
 *  除外ルール:
 *  ・resolvedLinks で解決できるリンク → リンク先が除外フォルダならカウントしない
 *  ・フォールバック時は getFirstLinkpathDest で解決して同様に判定
 *
 *  仕様:
 *  未解決リンク（dest === null）は除外フォルダかどうか判定できないため
 *  カウントに含める。これは意図した仕様。
 *
 *  キャッシュ未温まり対策:
 *  resolvedLinks にファイルのエントリが無くても cache.links にリンクが
 *  あればフォールバックに回す。両方空なら真に 0。
 *
 *  一意カウント:
 *  resolvedLinks パスはターゲットパスをキーとするため自然に一意だが、
 *  フォールバックでは cache.links に同一ターゲットへの重複リンクが
 *  含まれうるため Set で一意化する。未解決リンクはリンクテキストで
 *  一意化する（キー: `__unresolved__:${linkCache.link}`）。
 * ================================================================ */

export function getOutLinkCountFiltered(
    app: App,
    file: TFile,
    excludedFolders: string[]
): number {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaCache = app.metadataCache as any;
        const resolvedLinks:
            | Record<string, Record<string, number>>
            | undefined = metaCache.resolvedLinks;

        if (resolvedLinks && typeof resolvedLinks === "object") {
            const fileLinks = resolvedLinks[file.path];
            if (fileLinks && typeof fileLinks === "object") {
                const targets = Object.keys(fileLinks);
                const filtered = targets.filter(
                    (target) =>
                        !pathStartsWithFolder(target, excludedFolders)
                );
                return filtered.length;
            }

            const cacheCheck = app.metadataCache.getFileCache(file);
            if (!cacheCheck?.links || cacheCheck.links.length === 0) {
                return 0;
            }
        }
    } catch (_e) {
        // フォールバックへ
    }

    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.links) return 0;

    const seen = new Set<string>();
    for (const linkCache of cache.links) {
        const dest = app.metadataCache.getFirstLinkpathDest(
            linkCache.link,
            file.path
        );
        if (dest) {
            if (pathStartsWithFolder(dest.path, excludedFolders)) {
                continue;
            }
            seen.add(dest.path);
        } else {
            seen.add(`__unresolved__:${linkCache.link}`);
        }
    }
    return seen.size;
}

/* ================================================================
 *  E.  孤立ノート診断 (connectedness)
 * ================================================================ */

export function diagnoseConnectedness(
    noteType: NoteType,
    outLinks: number,
    backlinkCount: number,
    tone: Tone,
    lang: Lang,
    emoji: boolean
): Diagnosis {
    if (noteType === "inbox" || noteType === "daily") {
        return { metric: "connectedness", level: "skip", message: "" };
    }

    if (outLinks === 0 && backlinkCount === 0) {
        return {
            metric: "connectedness",
            level: "critical",
            message: toneMsg(lang, tone, "connectedness", "critical", emoji),
            nextAction: {
                description: toneAct(
                    lang,
                    tone,
                    "connectedness",
                    "critical",
                    emoji
                ),
                why: t(lang, "why.connectedness.critical", undefined, emoji),
                effort: "medium",
            },
        };
    }

    if (outLinks === 0) {
        return {
            metric: "connectedness",
            level: "warning",
            message: toneMsg(lang, tone, "connectedness", "warning", emoji),
            nextAction: {
                description: toneAct(
                    lang,
                    tone,
                    "connectedness",
                    "warning",
                    emoji
                ),
                why: t(lang, "why.connectedness.warning", undefined, emoji),
                effort: "small",
            },
        };
    }

    if (backlinkCount === 0) {
        return {
            metric: "connectedness",
            level: "info",
            message: toneMsg(lang, tone, "connectedness", "info", emoji),
            nextAction: {
                description: toneAct(
                    lang,
                    tone,
                    "connectedness",
                    "info",
                    emoji
                ),
                why: t(lang, "why.connectedness.info", undefined, emoji),
                effort: "small",
            },
        };
    }

    return {
        metric: "connectedness",
        level: "healthy",
        message: t(lang, "healthy.connectedness", undefined, emoji),
    };
}

/* ================================================================
 *  F.  Inbox 滞留診断 (inbox-staleness)
 *
 *  daysInInbox は設定の inboxStaleBasis に応じて
 *  作成日ベースまたは最終更新日ベースで計算された日数を受け取る。
 * ================================================================ */

export function diagnoseInboxStaleness(
    noteType: NoteType,
    daysInInbox: number,
    settings: KnowledgeGardenerSettings,
    lang: Lang,
    emoji: boolean
): Diagnosis {
    if (noteType !== "inbox") {
        return { metric: "inbox-staleness", level: "skip", message: "" };
    }

    if (daysInInbox >= settings.inboxStaleDays) {
        return {
            metric: "inbox-staleness",
            level: "critical",
            message: toneMsg(
                lang,
                settings.tone,
                "inbox-staleness",
                "critical",
                emoji
            ),
            nextAction: {
                description: toneAct(
                    lang,
                    settings.tone,
                    "inbox-staleness",
                    "critical",
                    emoji
                ),
                why: t(
                    lang,
                    "why.inbox-staleness.critical",
                    {
                        days: daysInInbox,
                        basis: t(
                            lang,
                            `basis.${settings.inboxStaleBasis}`,
                            undefined,
                            emoji
                        ),
                        threshold: settings.inboxStaleDays,
                    },
                    emoji
                ),
                effort: "small",
            },
        };
    }

    return {
        metric: "inbox-staleness",
        level: "healthy",
        message: t(lang, "healthy.inbox-staleness", undefined, emoji),
    };
}

/* ================================================================
 *  G.  成熟度を処方箋化 (maturity → Diagnosis)
 * ================================================================ */

export function diagnoseMaturity(
    maturity: Maturity,
    tone: Tone,
    noteType: NoteType,
    lang: Lang,
    emoji: boolean
): Diagnosis {
    if (noteType === "inbox" || noteType === "daily") {
        return { metric: "maturity", level: "skip", message: "" };
    }

    switch (maturity) {
        case "Dead":
            return {
                metric: "maturity",
                level: "critical",
                message: toneMsg(lang, tone, "maturity", "Dead", emoji),
                nextAction: {
                    description: toneAct(lang, tone, "maturity", "Dead", emoji),
                    why: t(lang, "why.maturity.Dead", undefined, emoji),
                    effort: "medium",
                },
            };
        case "Seed":
            return {
                metric: "maturity",
                level: "warning",
                message: toneMsg(lang, tone, "maturity", "Seed", emoji),
                nextAction: {
                    description: toneAct(lang, tone, "maturity", "Seed", emoji),
                    why: t(lang, "why.maturity.Seed", undefined, emoji),
                    effort: "medium",
                },
            };
        case "Sprout":
            return {
                metric: "maturity",
                level: "info",
                message: toneMsg(lang, tone, "maturity", "Sprout", emoji),
                nextAction: {
                    description: toneAct(
                        lang,
                        tone,
                        "maturity",
                        "Sprout",
                        emoji
                    ),
                    why: t(lang, "why.maturity.Sprout", undefined, emoji),
                    effort: "small",
                },
            };
        case "Evergreen":
            return {
                metric: "maturity",
                level: "healthy",
                message: t(lang, "healthy.maturity", undefined, emoji),
            };
    }
}

/* ================================================================
 *  H.  処方箋の優先度（数値が小さいほど優先）
 * ================================================================ */

export function getPrescriptionPriority(d: Diagnosis): number {
    if (d.level === "skip" || d.level === "healthy") return 999;
    if (d.metric === "inbox-staleness") return 10;
    if (d.metric === "connectedness" && d.level === "critical") return 20;
    if (d.metric === "maturity" && d.level === "critical") return 30;
    if (d.metric === "maturity" && d.level === "warning") return 40;
    if (
        d.metric === "connectedness" &&
        (d.level === "warning" || d.level === "info")
    )
        return 50;
    if (d.metric === "maturity" && d.level === "info") return 60;
    return 99;
}

/* ================================================================
 *  i18n helpers — delegate to t() with tone-based key construction
 * ================================================================ */

function toneMsg(
    lang: Lang,
    tone: Tone,
    metric: string,
    level: string,
    emoji: boolean
): string {
    return t(lang, `msg.${tone}.${metric}.${level}`, undefined, emoji);
}

function toneAct(
    lang: Lang,
    tone: Tone,
    metric: string,
    level: string,
    emoji: boolean
): string {
    return t(lang, `act.${tone}.${metric}.${level}`, undefined, emoji);
}