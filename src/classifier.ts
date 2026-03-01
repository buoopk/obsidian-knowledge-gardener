import { TFile, FrontMatterCache } from "obsidian";
import { NoteType } from "./types";

/**
 * 設定からフォルダリストをパース
 * - 先頭スラッシュを除去
 * - 末尾スラッシュを除去
 * - 小文字に正規化
 */
export function parseFolderList(folderStr: string): string[] {
    return folderStr
        .split(",")
        .map((f) =>
            f
                .trim()
                .toLowerCase()
                .replace(/^\/+/, "")
                .replace(/\/+$/, "")
        )
        .filter((f) => f.length > 0);
}

/**
 * パスが指定フォルダのいずれかに属するかチェック（フォルダ境界を考慮）
 *
 * 判定ルール:
 *   - `folder + "/"` で始まる  → フォルダ配下のファイル（主要ケース）
 *   - パスと folder が完全一致 → フォルダ名だけのパス（TFile では拡張子が付くため
 *     通常は発生しないが、resolvedLinks 等で理論上あり得るため防御的に残す）
 *
 * ※ ルート直下のファイル（例: `Inbox.md`）は `"inbox.md" !== "inbox"` かつ
 *   `"inbox.md".startsWith("inbox/")` も false になるため誤判定しない。
 */
export function pathStartsWithFolder(path: string, folders: string[]): boolean {
    const lowerPath = path.toLowerCase();
    for (const folder of folders) {
        if (lowerPath.startsWith(folder + "/") || lowerPath === folder) {
            return true;
        }
    }
    return false;
}

/**
 * フロントマターの tags フィールドを正規化して文字列配列にする。
 *
 * 対応フォーマット:
 *   - 配列: `[" #Inbox ", "Literature"]` → `["inbox", "literature"]`
 *   - カンマ区切り文字列: `"#inbox, literature"` → `["inbox", "literature"]`
 *   - スペース区切り文字列: `"#inbox literature"` → `["inbox", "literature"]`
 *   - カンマ+スペース混在: `"#inbox, literature permanent"` → `["inbox", "literature", "permanent"]`
 *
 * 各タグに対して:
 *   1. trim
 *   2. lowercase
 *   3. 先頭の `#` を除去
 */
function normalizeTags(raw: unknown): string[] {
    let parts: string[];

    if (Array.isArray(raw)) {
        parts = raw.filter((t): t is string => typeof t === "string");
    } else if (typeof raw === "string") {
        // Split by commas first, then split each segment by whitespace
        parts = raw
            .split(",")
            .flatMap((segment) => segment.trim().split(/\s+/));
    } else {
        return [];
    }

    return parts
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter((t) => t.length > 0);
}

/**
 * フォルダ名やフロントマター、タグからノートの種類を分類する
 */
export function classifyNote(
    file: TFile,
    frontmatter: FrontMatterCache | undefined,
    inboxFolders: string[]
): NoteType {
    // 1. フロントマターの type フィールド
    if (frontmatter) {
        const typeStr =
            typeof frontmatter.type === "string"
                ? frontmatter.type.toLowerCase()
                : "";
        if (typeStr === "inbox") return "inbox";
        if (typeStr === "daily" || typeStr === "journal") return "daily";
        if (typeStr === "literature" || typeStr === "reading") return "literature";
        if (typeStr === "permanent" || typeStr === "zettelkasten") return "permanent";

        // 2. フロントマターの tags フィールド（正規化済み）
        const lowerTags = normalizeTags(frontmatter.tags);
        if (lowerTags.includes("inbox")) return "inbox";
        if (lowerTags.includes("daily")) return "daily";
        if (lowerTags.includes("literature")) return "literature";
        if (lowerTags.includes("permanent")) return "permanent";
    }

    // 3. フォルダパスによる分類
    if (pathStartsWithFolder(file.path, inboxFolders)) {
        return "inbox";
    }

    const lowerPath = file.path.toLowerCase();

    if (pathStartsWithFolder(lowerPath, ["daily", "journal", "journals"])) {
        return "daily";
    }

    if (
        pathStartsWithFolder(lowerPath, [
            "literature",
            "reading",
            "readings",
            "books",
        ])
    ) {
        return "literature";
    }

    if (pathStartsWithFolder(lowerPath, ["permanent", "zettelkasten", "zk"])) {
        return "permanent";
    }

    return "unknown";
}