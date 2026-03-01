import { Maturity, NoteStats, KnowledgeGardenerSettings } from "./types";

/**
 * ノートの統計情報から成熟度（Maturity）を判定する
 */
export function assessMaturity(
    stats: NoteStats,
    settings: KnowledgeGardenerSettings
): Maturity {
    if (stats.daysSinceUpdate >= settings.deadStaleDays) {
        return "Dead";
    }
    if (stats.charCount < settings.seedMinChars) {
        return "Seed";
    }
    if (stats.quoteRatio >= 0.3 || stats.linkCount < 2) {
        return "Sprout";
    }
    return "Evergreen";
}