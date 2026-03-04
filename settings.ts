import { App, PluginSettingTab, Setting } from "obsidian";
import type KnowledgeGardenerPlugin from "./main";
import {
    InboxStaleBasis,
    KnowledgeGardenerSettings,
    LangSetting,
    Tone,
} from "./types";
import { resolveLang, t } from "./i18n";

export const DEFAULT_SETTINGS: KnowledgeGardenerSettings = {
    seedMinChars: 300,
    deadStaleDays: 90,
    excludeFolders: "templates",
    inboxFolders: "Inbox",
    gracePeriodDays: 7,
    inboxStaleDays: 3,
    inboxStaleBasis: "modified",
    maxDailySuggestions: 3,
    tone: "gentle",
    language: "auto",
    enableEmoji: false,
    permanentFolder: "Permanent",
    literatureFolder: "Literature",
    archiveFolder: "Archive",
    cooldownDays: 7,
};

export class KnowledgeGardenerSettingTab extends PluginSettingTab {
    plugin: KnowledgeGardenerPlugin;

    constructor(app: App, plugin: KnowledgeGardenerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        const lang = resolveLang(this.plugin.settings.language);
        const emoji = this.plugin.settings.enableEmoji;
        containerEl.empty();

        // 【修正5】createEl("h2") → new Setting().setHeading().setName()
        new Setting(containerEl)
            .setHeading()
            .setName(t(lang, "settings.title", undefined, emoji));

        /* ---- Language ---- */

        new Setting(containerEl)
            .setName(t(lang, "settings.language.name", undefined, emoji))
            .setDesc(t(lang, "settings.language.desc", undefined, emoji))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption(
                        "auto",
                        t(lang, "settings.language.auto", undefined, emoji)
                    )
                    .addOption("en", "English")
                    .addOption("ja", "日本語")
                    .setValue(this.plugin.settings.language)
                    // 【修正3】async を除去し、saveSettings() を void で明示的に無視
                    .onChange((value) => {
                        this.plugin.settings.language = value as LangSetting;
                        void this.plugin.saveSettings();
                        this.display();
                    })
            );

        /* ---- Emoji toggle ---- */

        new Setting(containerEl)
            .setName(t(lang, "settings.enableEmoji.name", undefined, emoji))
            .setDesc(t(lang, "settings.enableEmoji.desc", undefined, emoji))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableEmoji)
                    .onChange((value) => {
                        this.plugin.settings.enableEmoji = value;
                        void this.plugin.saveSettings();
                        this.display();
                    })
            );

        /* ---- Maturity thresholds ---- */

        new Setting(containerEl)
            .setName(t(lang, "settings.seedMinChars.name", undefined, emoji))
            .setDesc(t(lang, "settings.seedMinChars.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("300")
                    .setValue(String(this.plugin.settings.seedMinChars))
                    .onChange((value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.seedMinChars = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName(t(lang, "settings.deadStaleDays.name", undefined, emoji))
            .setDesc(t(lang, "settings.deadStaleDays.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("90")
                    .setValue(String(this.plugin.settings.deadStaleDays))
                    .onChange((value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.deadStaleDays = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        /* ---- Folder config ---- */

        new Setting(containerEl)
            .setName(t(lang, "settings.excludeFolders.name", undefined, emoji))
            .setDesc(t(lang, "settings.excludeFolders.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("templates, daily")
                    .setValue(this.plugin.settings.excludeFolders)
                    .onChange((value) => {
                        this.plugin.settings.excludeFolders = value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t(lang, "settings.inboxFolders.name", undefined, emoji))
            .setDesc(t(lang, "settings.inboxFolders.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("Inbox")
                    .setValue(this.plugin.settings.inboxFolders)
                    .onChange((value) => {
                        this.plugin.settings.inboxFolders = value;
                        void this.plugin.saveSettings();
                    })
            );

        /* ---- Safety ---- */

        // 【修正5】createEl("h3") → new Setting().setHeading().setName()
        new Setting(containerEl)
            .setHeading()
            .setName(t(lang, "settings.safetySection", undefined, emoji));

        new Setting(containerEl)
            .setName(t(lang, "settings.gracePeriodDays.name", undefined, emoji))
            .setDesc(t(lang, "settings.gracePeriodDays.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("7")
                    .setValue(String(this.plugin.settings.gracePeriodDays))
                    .onChange((value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.gracePeriodDays = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        /* ---- Inbox staleness ---- */

        // 【修正5】createEl("h3") → new Setting().setHeading().setName()
        new Setting(containerEl)
            .setHeading()
            .setName(t(lang, "settings.inboxSection", undefined, emoji));

        new Setting(containerEl)
            .setName(t(lang, "settings.inboxStaleDays.name", undefined, emoji))
            .setDesc(t(lang, "settings.inboxStaleDays.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("3")
                    .setValue(String(this.plugin.settings.inboxStaleDays))
                    .onChange((value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.inboxStaleDays = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName(t(lang, "settings.inboxStaleBasis.name", undefined, emoji))
            .setDesc(t(lang, "settings.inboxStaleBasis.desc", undefined, emoji))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption(
                        "modified",
                        t(
                            lang,
                            "settings.inboxStaleBasis.modified",
                            undefined,
                            emoji
                        )
                    )
                    .addOption(
                        "creation",
                        t(
                            lang,
                            "settings.inboxStaleBasis.creation",
                            undefined,
                            emoji
                        )
                    )
                    .setValue(this.plugin.settings.inboxStaleBasis)
                    .onChange((value) => {
                        this.plugin.settings.inboxStaleBasis =
                            value as InboxStaleBasis;
                        void this.plugin.saveSettings();
                    })
            );

        /* ---- Prescription ---- */

        // 【修正5】createEl("h3") → new Setting().setHeading().setName()
        new Setting(containerEl)
            .setHeading()
            .setName(
                t(lang, "settings.prescriptionSection", undefined, emoji)
            );

        new Setting(containerEl)
            .setName(
                t(lang, "settings.maxDailySuggestions.name", undefined, emoji)
            )
            .setDesc(
                t(lang, "settings.maxDailySuggestions.desc", undefined, emoji)
            )
            .addText((text) =>
                text
                    .setPlaceholder("3")
                    .setValue(
                        String(this.plugin.settings.maxDailySuggestions)
                    )
                    .onChange((value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.maxDailySuggestions = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName(t(lang, "settings.tone.name", undefined, emoji))
            .setDesc(t(lang, "settings.tone.desc", undefined, emoji))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption(
                        "gentle",
                        t(lang, "settings.tone.gentle", undefined, emoji)
                    )
                    .addOption(
                        "neutral",
                        t(lang, "settings.tone.neutral", undefined, emoji)
                    )
                    .addOption(
                        "strict",
                        t(lang, "settings.tone.strict", undefined, emoji)
                    )
                    .setValue(this.plugin.settings.tone)
                    .onChange((value) => {
                        this.plugin.settings.tone = value as Tone;
                        void this.plugin.saveSettings();
                    })
            );

        /* ---- Pro-only: Prescription cooldown, history, quick actions ---- */

        if (IS_PRO) {
            // 【修正4】Sentence case: "Prescription cooldown (days)" は既に正しい
            new Setting(containerEl)
                .setName("Prescription cooldown (days)")
                .setDesc(
                    "After a note is suggested in the daily prescription, it will " +
                        "not be suggested again for this many days. " +
                        "Set to 0 to disable the cooldown and always show all eligible notes."
                )
                .addText((text) =>
                    text
                        .setPlaceholder("7")
                        .setValue(
                            String(this.plugin.settings.cooldownDays)
                        )
                        .onChange((value) => {
                            const num = parseInt(value, 10);
                            if (!isNaN(num) && num >= 0) {
                                this.plugin.settings.cooldownDays = num;
                                void this.plugin.saveSettings();
                            }
                        })
                );

            const historyCount = this.plugin.getHistoryCount();
            new Setting(containerEl)
                .setName("Clear prescription history")
                .setDesc(
                    `${historyCount} ${historyCount === 1 ? "note" : "notes"} in history. ` +
                        "Clearing allows previously suggested notes to be suggested again immediately."
                )
                .addButton((btn) =>
                    btn
                        .setButtonText("Clear history")
                        .setWarning()
                        .onClick(() => {
                            this.plugin.clearPrescriptionHistory();
                            this.display();
                        })
                );

            /* ---- Quick Actions (destination folders) ---- */

            // 【修正4】Sentence case: "Quick Actions" → "Quick actions"
            // 【修正5】createEl("h3") → new Setting().setHeading().setName()
            new Setting(containerEl)
                .setHeading()
                .setName("Quick actions");

            new Setting(containerEl)
                .setName("Permanent notes folder")
                .setDesc(
                    "Destination folder when moving an inbox note to Permanent. " +
                        "Created automatically if it does not exist."
                )
                .addText((text) =>
                    text
                        .setPlaceholder("Permanent")
                        .setValue(this.plugin.settings.permanentFolder)
                        .onChange((value) => {
                            this.plugin.settings.permanentFolder = value;
                            void this.plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("Literature notes folder")
                .setDesc(
                    "Destination folder when moving an inbox note to Literature. " +
                        "Created automatically if it does not exist."
                )
                .addText((text) =>
                    text
                        .setPlaceholder("Literature")
                        .setValue(this.plugin.settings.literatureFolder)
                        .onChange((value) => {
                            this.plugin.settings.literatureFolder = value;
                            void this.plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("Archive folder")
                .setDesc(
                    "Destination folder when archiving dead notes. " +
                        "The note's frontmatter will also be updated with " +
                        "archived: true and health-check: skip. " +
                        "Created automatically if it does not exist."
                )
                .addText((text) =>
                    text
                        .setPlaceholder("Archive")
                        .setValue(this.plugin.settings.archiveFolder)
                        .onChange((value) => {
                            this.plugin.settings.archiveFolder = value;
                            void this.plugin.saveSettings();
                        })
                );
        }
    }
}