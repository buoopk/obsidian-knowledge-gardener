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

        containerEl.createEl("h2", {
            text: t(lang, "settings.title", undefined, emoji),
        });

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
                    .onChange(async (value) => {
                        this.plugin.settings.language = value as LangSetting;
                        await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        this.plugin.settings.enableEmoji = value;
                        await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.seedMinChars = num;
                            await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.deadStaleDays = num;
                            await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        this.plugin.settings.excludeFolders = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t(lang, "settings.inboxFolders.name", undefined, emoji))
            .setDesc(t(lang, "settings.inboxFolders.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("Inbox")
                    .setValue(this.plugin.settings.inboxFolders)
                    .onChange(async (value) => {
                        this.plugin.settings.inboxFolders = value;
                        await this.plugin.saveSettings();
                    })
            );

        /* ---- Safety ---- */

        containerEl.createEl("h3", {
            text: t(lang, "settings.safetySection", undefined, emoji),
        });

        new Setting(containerEl)
            .setName(t(lang, "settings.gracePeriodDays.name", undefined, emoji))
            .setDesc(t(lang, "settings.gracePeriodDays.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("7")
                    .setValue(String(this.plugin.settings.gracePeriodDays))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.gracePeriodDays = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        /* ---- Inbox staleness ---- */

        containerEl.createEl("h3", {
            text: t(lang, "settings.inboxSection", undefined, emoji),
        });

        new Setting(containerEl)
            .setName(t(lang, "settings.inboxStaleDays.name", undefined, emoji))
            .setDesc(t(lang, "settings.inboxStaleDays.desc", undefined, emoji))
            .addText((text) =>
                text
                    .setPlaceholder("3")
                    .setValue(String(this.plugin.settings.inboxStaleDays))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.inboxStaleDays = num;
                            await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        this.plugin.settings.inboxStaleBasis =
                            value as InboxStaleBasis;
                        await this.plugin.saveSettings();
                    })
            );

        /* ---- Prescription ---- */

        containerEl.createEl("h3", {
            text: t(lang, "settings.prescriptionSection", undefined, emoji),
        });

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
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.maxDailySuggestions = num;
                            await this.plugin.saveSettings();
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
                    .onChange(async (value) => {
                        this.plugin.settings.tone = value as Tone;
                        await this.plugin.saveSettings();
                    })
            );

        /* ---- Pro-only: Prescription cooldown, history, quick actions ---- */

        if (IS_PRO) {
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
                        .onChange(async (value) => {
                            const num = parseInt(value, 10);
                            if (!isNaN(num) && num >= 0) {
                                this.plugin.settings.cooldownDays = num;
                                await this.plugin.saveSettings();
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

            containerEl.createEl("h3", { text: "Quick Actions" });

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
                        .onChange(async (value) => {
                            this.plugin.settings.permanentFolder = value;
                            await this.plugin.saveSettings();
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
                        .onChange(async (value) => {
                            this.plugin.settings.literatureFolder = value;
                            await this.plugin.saveSettings();
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
                        .onChange(async (value) => {
                            this.plugin.settings.archiveFolder = value;
                            await this.plugin.saveSettings();
                        })
                );
        }
    }
}