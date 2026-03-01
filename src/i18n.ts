import { Lang, LangSetting } from "./types";

/**
 * Resolve a LangSetting to a concrete Lang.
 * "auto" detects from the browser/Electron navigator.language,
 * defaulting to "en" if detection fails or language is unsupported.
 */
export function resolveLang(setting: LangSetting): Lang {
    if (setting !== "auto") return setting;
    try {
        const navLang = window.navigator.language.toLowerCase();
        if (navLang.startsWith("ja")) return "ja";
    } catch (_e) {
        // safe fallback
    }
    return "en";
}

/* ================================================================
 *  Emoji helpers
 * ================================================================ */

/**
 * Strip all Extended_Pictographic emoji (and their optional variation
 * selector U+FE0F) plus one optional trailing ASCII space from a string.
 *
 * Leading whitespace used for indentation is preserved.
 * Trailing spaces left over after emoji removal are trimmed.
 */
export function stripEmoji(str: string): string {
    return str
        .replace(/\p{Extended_Pictographic}\uFE0F?[ ]?/gu, "")
        .replace(/ +$/, "");
}

/**
 * Conditionally prepend an emoji to text.
 *
 * @example
 * formatEmoji(true,  "📄", "MyNote")  // "📄 MyNote"
 * formatEmoji(false, "📄", "MyNote")  // "MyNote"
 */
export function formatEmoji(
    enabled: boolean,
    emoji: string,
    text: string
): string {
    return enabled ? `${emoji} ${text}` : text;
}

/* ================================================================
 *  English dictionary  (canonical source of truth)
 * ================================================================ */

const EN: Record<string, string> = {
    // ---- Settings page ----
    "settings.title": "Knowledge Gardener — Settings",
    "settings.language.name": "Language",
    "settings.language.desc":
        "Display language for the plugin. A reload may be needed for command palette names to update.",
    "settings.language.auto": "Auto-detect",
    "settings.enableEmoji.name": "Show emoji",
    "settings.enableEmoji.desc":
        "Display emoji icons in messages and labels. Disable for a cleaner, professional appearance.",
    "settings.seedMinChars.name": "🌱 Seed minimum characters",
    "settings.seedMinChars.desc":
        "Notes shorter than this are classified as Seed.",
    "settings.deadStaleDays.name": "💀 Dead note threshold (days)",
    "settings.deadStaleDays.desc":
        "Notes not updated for this many days are classified as Dead.",
    "settings.excludeFolders.name": "Excluded folders",
    "settings.excludeFolders.desc":
        "Folders to exclude from scanning (comma-separated, e.g. templates, daily). " +
        "Notes in these folders are not diagnosed. Resolved link counts also exclude " +
        "these folders (unresolved links may still be counted).",
    "settings.inboxFolders.name": "📥 Inbox folders",
    "settings.inboxFolders.desc":
        "Folders treated as Inbox (comma-separated, e.g. Inbox, 00_Inbox). " +
        "Leading/trailing slashes are removed automatically.",
    "settings.safetySection": "🛡️ Safety",
    "settings.gracePeriodDays.name": "Grace period (days)",
    "settings.gracePeriodDays.desc":
        "Notes created within this many days are excluded from diagnosis " +
        "(does not apply to Inbox staleness).",
    "settings.inboxSection": "📥 Inbox staleness",
    "settings.inboxStaleDays.name": "Inbox stale days",
    "settings.inboxStaleDays.desc":
        "Inbox notes exceeding this age trigger a staleness warning.",
    "settings.inboxStaleBasis.name": "Inbox staleness basis",
    "settings.inboxStaleBasis.desc":
        "Whether staleness is measured from last modified date or creation date.",
    "settings.inboxStaleBasis.modified": "Last modified",
    "settings.inboxStaleBasis.creation": "Creation date",
    "settings.prescriptionSection": "💊 Prescription",
    "settings.maxDailySuggestions.name": "Max daily suggestions",
    "settings.maxDailySuggestions.desc":
        "Maximum number of actions shown in Today's Prescription.",
    "settings.tone.name": "Tone",
    "settings.tone.desc": "Tone of diagnosis messages.",
    "settings.tone.gentle": "🌸 Gentle",
    "settings.tone.neutral": "📝 Neutral",
    "settings.tone.strict": "🔥 Strict",

    // ---- Commands & ribbon ----
    "command.scanVault": "Scan vault",
    "command.dailyPrescription": "Today's prescription",
    "ribbon.tooltip": "Knowledge Gardener",

    // ---- Notices ----
    "notice.scanning": "🌱 Scanning vault…",
    "notice.diagnosing": "🌱 Diagnosing…",
    "notice.scanResult": "📊 Scan Results",
    "notice.totalFiles": "Total files: {count}",
    "notice.excluded": "  Excluded: {count}",
    "notice.skipped": "  Skipped: {count}",
    "notice.scanned": "  Scanned: {count}",
    "notice.errored": "  Errors: {count}",
    "notice.maturitySection": "🌳 Maturity distribution:",
    "notice.seed": "  🌱 Seed: {count}",
    "notice.sprout": "  🌿 Sprout: {count}",
    "notice.evergreen": "  🌲 Evergreen: {count}",
    "notice.dead": "  💀 Dead: {count}",
    "notice.orphans": "🔗 Orphan notes: {count}",
    "notice.staleInbox": "📥 Stale inbox: {count}",

    // ---- Modal ----
    "modal.title": "💊 Today's Prescription",
    "modal.empty":
        "🎉 Nothing to do today! Your garden looks wonderful.",

    // ---- Diagnosis messages: gentle ----
    "msg.gentle.connectedness.critical":
        "🌿 This note isn't connected to anything yet. How about adding a few links?",
    "msg.gentle.connectedness.warning":
        "🌿 No outgoing links yet. Let's find some related notes.",
    "msg.gentle.connectedness.info":
        "🌿 No other note links here yet. Try mentioning it from somewhere.",
    "msg.gentle.inbox-staleness.critical":
        "📥 This has been sitting in the Inbox a while. Organizing it might feel nice!",
    "msg.gentle.maturity.Dead":
        "💤 This note has been sleeping for a while. Want to revisit it?",
    "msg.gentle.maturity.Seed":
        "🌱 Still a tiny seed. Try adding to it little by little.",
    "msg.gentle.maturity.Sprout":
        "🌿 Growing nicely! A bit more work and it could become Evergreen.",

    // ---- Diagnosis messages: neutral ----
    "msg.neutral.connectedness.critical":
        "Orphan note: both outgoing and incoming links are 0.",
    "msg.neutral.connectedness.warning":
        "Outgoing links are 0. Add links to related notes.",
    "msg.neutral.connectedness.info":
        "Incoming links are 0. No references from other notes.",
    "msg.neutral.inbox-staleness.critical":
        "Inbox stale: threshold exceeded. Classify or process this note.",
    "msg.neutral.maturity.Dead":
        "Dead: no recent updates. Consider reviewing or archiving.",
    "msg.neutral.maturity.Seed":
        "Seed: below minimum character count. Add more content.",
    "msg.neutral.maturity.Sprout":
        "Sprout: high quote ratio or few links. Room for improvement.",

    // ---- Diagnosis messages: strict ----
    "msg.strict.connectedness.critical":
        "⚠️ Completely isolated. Add links now.",
    "msg.strict.connectedness.warning":
        "⚠️ Zero outgoing links. Connect this note.",
    "msg.strict.connectedness.info":
        "⚠️ Zero incoming links. Make this referenceable.",
    "msg.strict.inbox-staleness.critical":
        "🚨 Stuck in Inbox too long! Process immediately.",
    "msg.strict.maturity.Dead":
        "🚨 Abandoned note. Update or archive it.",
    "msg.strict.maturity.Seed":
        "⚠️ Insufficient content. Write more now.",
    "msg.strict.maturity.Sprout":
        "⚠️ Not good enough. Add links and rewrite quotes.",

    // ---- Diagnosis actions: gentle ----
    "act.gentle.connectedness.critical":
        "Find 1–2 related notes and add links 🔗",
    "act.gentle.connectedness.warning":
        "Search for related keywords and try adding links.",
    "act.gentle.connectedness.info":
        "If this topic comes up elsewhere, link back here.",
    "act.gentle.inbox-staleness.critical":
        "Move to permanent or literature, or delete if unneeded.",
    "act.gentle.maturity.Dead":
        "Re-read and expand, or archive if no longer relevant.",
    "act.gentle.maturity.Seed":
        "Write a few more paragraphs in your own words.",
    "act.gentle.maturity.Sprout":
        "Rephrase quotes in your own words and add related links.",

    // ---- Diagnosis actions: neutral ----
    "act.neutral.connectedness.critical":
        "Add both outgoing and incoming links.",
    "act.neutral.connectedness.warning":
        "Add links to related notes.",
    "act.neutral.connectedness.info":
        "Reference this note from other notes.",
    "act.neutral.inbox-staleness.critical":
        "Classify into the appropriate folder or process it.",
    "act.neutral.maturity.Dead":
        "Review and update, or archive.",
    "act.neutral.maturity.Seed":
        "Add content to exceed the minimum character count.",
    "act.neutral.maturity.Sprout":
        "Lower the quote ratio and add more links.",

    // ---- Diagnosis actions: strict ----
    "act.strict.connectedness.critical":
        "Add at least 2 links.",
    "act.strict.connectedness.warning":
        "Add outgoing links.",
    "act.strict.connectedness.info":
        "Ensure incoming links exist.",
    "act.strict.inbox-staleness.critical":
        "Classify or delete immediately.",
    "act.strict.maturity.Dead":
        "Update or archive. Neglect is not acceptable.",
    "act.strict.maturity.Seed":
        "Add content to meet the threshold.",
    "act.strict.maturity.Sprout":
        "Rewrite quotes and add links.",

    // ---- Why strings ----
    "why.connectedness.critical":
        "No connections to any other note — knowledge is completely isolated.",
    "why.connectedness.warning":
        "No outgoing links, so there are no pathways to related knowledge.",
    "why.connectedness.info":
        "Not referenced from any other note.",
    "why.inbox-staleness.critical":
        "In Inbox for {days} days (threshold: {threshold}+ days since {basis}).",
    "why.maturity.Dead":
        "Not updated for a long time. If still valuable, it needs attention.",
    "why.maturity.Seed":
        "Content is sparse; not yet established as knowledge.",
    "why.maturity.Sprout":
        "Add more links or rephrase quotes in your own words to help it grow.",

    // ---- Healthy messages ----
    "healthy.connectedness": "Well connected.",
    "healthy.inbox-staleness": "Still within the Inbox grace period.",
    "healthy.maturity": "Excellent! This note is fully mature.",

    // ---- Basis labels (used inside why.inbox-staleness interpolation) ----
    "basis.creation": "creation",
    "basis.modified": "last modified",
};

/* ================================================================
 *  Japanese dictionary
 * ================================================================ */

const JA: Record<string, string> = {
    // ---- Settings page ----
    "settings.title": "Knowledge Gardener − 設定",
    "settings.language.name": "言語",
    "settings.language.desc":
        "プラグインの表示言語を選択します。コマンド名の反映にはリロードが必要な場合があります。",
    "settings.language.auto": "自動検出",
    "settings.enableEmoji.name": "絵文字を表示",
    "settings.enableEmoji.desc":
        "メッセージやラベルに絵文字を表示します。無効にするとプロフェッショナルな表示になります。",
    "settings.seedMinChars.name": "🌱 Seed（短すぎるノート）の基準文字数",
    "settings.seedMinChars.desc":
        "この文字数未満のノートを「Seed」として判定します。",
    "settings.deadStaleDays.name": "💀 Dead（放置ノート）の基準日数",
    "settings.deadStaleDays.desc":
        "この日数以上更新されていないノートを「Dead」として判定します。",
    "settings.excludeFolders.name": "除外フォルダ",
    "settings.excludeFolders.desc":
        "スキャン対象外にするフォルダ（カンマ区切り。例: templates, daily）。" +
        "これらのフォルダ内のノートは診断されません。リンク数の集計も、" +
        "解決できるリンクについては除外フォルダをカウントしません" +
        "（未解決リンクは除外判定できないため含まれる場合があります）。",
    "settings.inboxFolders.name": "📥 Inbox フォルダ",
    "settings.inboxFolders.desc":
        "Inbox として扱うフォルダ（カンマ区切り。例: Inbox, 00_Inbox）。" +
        "先頭・末尾の / は自動で除去されます。",
    "settings.safetySection": "🛡️ 安全弁",
    "settings.gracePeriodDays.name": "猶予期間（日数）",
    "settings.gracePeriodDays.desc":
        "ノート作成からこの日数以内のノートは診断対象外になります" +
        "（Inbox ノートの滞留診断には適用されません）。",
    "settings.inboxSection": "📥 Inbox 滞留",
    "settings.inboxStaleDays.name": "Inbox 滞留日数",
    "settings.inboxStaleDays.desc":
        "Inbox ノートがこの日数以上経過すると滞留として警告します。",
    "settings.inboxStaleBasis.name": "Inbox 滞留の計算基準",
    "settings.inboxStaleBasis.desc":
        "Inbox 滞留日数の計算基準を選択します。" +
        "「最終更新日」はファイルの最終更新日から、「作成日」はファイルの作成日から計算します。",
    "settings.inboxStaleBasis.modified": "最終更新日",
    "settings.inboxStaleBasis.creation": "作成日",
    "settings.prescriptionSection": "💊 処方箋",
    "settings.maxDailySuggestions.name": "1日の提案数上限",
    "settings.maxDailySuggestions.desc":
        "「今日の処方箋」で表示するアクションの最大数。",
    "settings.tone.name": "トーン",
    "settings.tone.desc": "診断メッセージの口調を選択します。",
    "settings.tone.gentle": "🌸 やさしい",
    "settings.tone.neutral": "📝 ふつう",
    "settings.tone.strict": "🔥 きびしい",

    // ---- Commands & ribbon ----
    "command.scanVault": "Vault をスキャン",
    "command.dailyPrescription": "今日の処方箋",
    "ribbon.tooltip": "Knowledge Gardener",

    // ---- Notices ----
    "notice.scanning": "🌱 Vault をスキャン中…",
    "notice.diagnosing": "🌱 診断中…",
    "notice.scanResult": "📊 スキャン結果",
    "notice.totalFiles": "総ファイル数: {count}",
    "notice.excluded": "  除外: {count}",
    "notice.skipped": "  スキップ: {count}",
    "notice.scanned": "  スキャン: {count}",
    "notice.errored": "  エラー: {count}",
    "notice.maturitySection": "🌳 成熟度分布:",
    "notice.seed": "  🌱 Seed: {count}",
    "notice.sprout": "  🌿 Sprout: {count}",
    "notice.evergreen": "  🌲 Evergreen: {count}",
    "notice.dead": "  💀 Dead: {count}",
    "notice.orphans": "🔗 孤立ノート: {count}",
    "notice.staleInbox": "📥 Inbox 滞留: {count}",

    // ---- Modal ----
    "modal.title": "💊 今日の処方箋",
    "modal.empty": "🎉 今日やることはありません！素晴らしい庭ですね。",

    // ---- Diagnosis messages: gentle ----
    "msg.gentle.connectedness.critical":
        "🌿 このノートはまだ誰ともつながっていないようです。少しずつリンクを増やしてみませんか？",
    "msg.gentle.connectedness.warning":
        "🌿 発リンクがまだないようです。関連するノートを探してみましょう。",
    "msg.gentle.connectedness.info":
        "🌿 まだどこからも参照されていません。他のノートから言及してみると良いかもしれません。",
    "msg.gentle.inbox-staleness.critical":
        "📥 Inbox に少し長くいるようです。整理してあげると気持ちいいですよ。",
    "msg.gentle.maturity.Dead":
        "💤 しばらく眠っているノートです。もう一度見直してみませんか？",
    "msg.gentle.maturity.Seed":
        "🌱 まだ小さな芽です。少しずつ書き足していきましょう。",
    "msg.gentle.maturity.Sprout":
        "🌿 順調に育っています！あと少し手を加えると Evergreen になれそうです。",

    // ---- Diagnosis messages: neutral ----
    "msg.neutral.connectedness.critical":
        "孤立ノート: 発リンク・被リンクともに 0 です。",
    "msg.neutral.connectedness.warning":
        "発リンクが 0 です。関連ノートへのリンクを追加してください。",
    "msg.neutral.connectedness.info":
        "被リンクが 0 です。他ノートからの参照がありません。",
    "msg.neutral.inbox-staleness.critical":
        "Inbox 滞留: 基準日数以上経過しています。分類または処理してください。",
    "msg.neutral.maturity.Dead":
        "Dead: 長期間更新がありません。レビューまたはアーカイブを検討してください。",
    "msg.neutral.maturity.Seed":
        "Seed: 文字数が基準未満です。内容を追記してください。",
    "msg.neutral.maturity.Sprout":
        "Sprout: 引用率が高いかリンクが少ないです。改善の余地があります。",

    // ---- Diagnosis messages: strict ----
    "msg.strict.connectedness.critical":
        "⚠️ 完全に孤立しています。今すぐリンクを追加してください。",
    "msg.strict.connectedness.warning":
        "⚠️ 発リンクがゼロです。他のノートとつなげてください。",
    "msg.strict.connectedness.info":
        "⚠️ 被リンクがゼロです。参照されるようにしてください。",
    "msg.strict.inbox-staleness.critical":
        "🚨 Inbox に放置されすぎです！今すぐ処理してください。",
    "msg.strict.maturity.Dead":
        "🚨 放置ノートです。更新するかアーカイブしてください。",
    "msg.strict.maturity.Seed":
        "⚠️ 内容不足です。すぐに加筆してください。",
    "msg.strict.maturity.Sprout":
        "⚠️ まだ不十分です。リンク追加・引用の書き換えを実行してください。",

    // ---- Diagnosis actions: gentle ----
    "act.gentle.connectedness.critical":
        "関連しそうなノートを 1〜2 個探して、リンクを貼ってみましょう 🔗",
    "act.gentle.connectedness.warning":
        "このノートに関連するキーワードで検索して、リンクを追加してみませんか？",
    "act.gentle.connectedness.info":
        "このノートの内容に触れている場所があれば、そこからリンクしてみましょう。",
    "act.gentle.inbox-staleness.critical":
        "permanent か literature に移動するか、不要なら削除を検討してみましょう。",
    "act.gentle.maturity.Dead":
        "内容を読み返して、加筆するか、必要なければアーカイブしましょう。",
    "act.gentle.maturity.Seed":
        "あと数段落、自分の言葉で書き足してみましょう。",
    "act.gentle.maturity.Sprout":
        "引用部分を自分の言葉で言い換えたり、関連ノートへのリンクを増やしてみましょう。",

    // ---- Diagnosis actions: neutral ----
    "act.neutral.connectedness.critical":
        "発リンクと被リンクを追加してください。",
    "act.neutral.connectedness.warning":
        "関連ノートへのリンクを追加してください。",
    "act.neutral.connectedness.info":
        "他のノートからこのノートへ参照を追加してください。",
    "act.neutral.inbox-staleness.critical":
        "適切なフォルダに分類するか、処理してください。",
    "act.neutral.maturity.Dead":
        "内容をレビューし、更新またはアーカイブしてください。",
    "act.neutral.maturity.Seed":
        "内容を追記して基準文字数を超えるようにしてください。",
    "act.neutral.maturity.Sprout":
        "引用率を下げ、リンクを増やしてください。",

    // ---- Diagnosis actions: strict ----
    "act.strict.connectedness.critical":
        "リンクを最低 2 本追加すること。",
    "act.strict.connectedness.warning":
        "発リンクを追加すること。",
    "act.strict.connectedness.info":
        "被リンクを確保すること。",
    "act.strict.inbox-staleness.critical":
        "即座に分類または削除すること。",
    "act.strict.maturity.Dead":
        "更新するかアーカイブすること。放置は許されません。",
    "act.strict.maturity.Seed":
        "加筆して基準を満たすこと。",
    "act.strict.maturity.Sprout":
        "引用を書き換え、リンクを追加すること。",

    // ---- Why strings ----
    "why.connectedness.critical":
        "他のノートとのつながりがまったくなく、知識が孤立しています。",
    "why.connectedness.warning":
        "発リンクがない���め、関連知識への導線がありません。",
    "why.connectedness.info":
        "どこからも参照されていないノートです。",
    "why.inbox-staleness.critical":
        "Inbox に {days} 日間放置されています（基準: {basis}から {threshold} 日以上）。",
    "why.maturity.Dead":
        "長期間更新されていません。まだ価値があるなら手を入れましょう。",
    "why.maturity.Seed":
        "内容がまだ少なく、知識として定着していません。",
    "why.maturity.Sprout":
        "もう少しリンクを増やすか、引用を自分の言葉に置き換えると成長します。",

    // ---- Healthy messages ----
    "healthy.connectedness": "十分につながっています。",
    "healthy.inbox-staleness": "Inbox 内でまだ猶予があります。",
    "healthy.maturity": "素晴らしい！このノートは十分に成熟しています。",

    // ---- Basis labels ----
    "basis.creation": "作成",
    "basis.modified": "最終更新",
};

/* ================================================================
 *  Translation function
 *
 *  Looks up `key` in the dictionary for `lang`.
 *  Falls back to EN, then to the raw key.
 *  Simple {varName} interpolation via `vars`.
 *
 *  When `emoji` is explicitly `false`, all Extended_Pictographic
 *  characters (and their trailing space) are stripped from the result.
 *  Omitting `emoji` or passing `true` keeps them intact.
 * ================================================================ */

export function t(
    lang: Lang,
    key: string,
    vars?: Record<string, string | number>,
    emoji?: boolean
): string {
    const dict = lang === "ja" ? JA : EN;
    let str = dict[key] ?? EN[key] ?? key;
    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            str = str.replace(
                new RegExp(`\\{${k}\\}`, "g"),
                String(v)
            );
        }
    }
    if (emoji === false) {
        str = stripEmoji(str);
    }
    return str;
}