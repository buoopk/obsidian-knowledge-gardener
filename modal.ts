import { App, Modal, Notice, TFile } from "obsidian";
import { KnowledgeGardenerSettings, Lang, PrescriptionItem } from "./types";
import { formatEmoji, t } from "./i18n";

export class PrescriptionModal extends Modal {
    private prescriptions: PrescriptionItem[];
    private lang: Lang;
    private emoji: boolean;
    private settings: KnowledgeGardenerSettings;

    constructor(
        app: App,
        prescriptions: PrescriptionItem[],
        lang: Lang,
        emoji: boolean,
        settings: KnowledgeGardenerSettings
    ) {
        super(app);
        this.prescriptions = prescriptions;
        this.lang = lang;
        this.emoji = emoji;
        this.settings = settings;
    }

    onOpen() {
        const { contentEl } = this;
        const { lang, emoji } = this;
        contentEl.empty();

        contentEl.createEl("h2", {
            text: t(lang, "modal.title", undefined, emoji),
        });

        if (this.prescriptions.length === 0) {
            contentEl.createEl("p", {
                text: t(lang, "modal.empty", undefined, emoji),
                cls: "kg-empty-message",
            });
            return;
        }

        const list = contentEl.createEl("div", {
            cls: "kg-prescription-list",
        });

        for (let i = 0; i < this.prescriptions.length; i++) {
            const item = this.prescriptions[i];
            if (item === undefined) continue;

            const { noteDiagnosis, topDiagnosis } = item;
            const { file } = noteDiagnosis;

            const card = list.createEl("div", {
                cls: "kg-prescription-card",
            });

            /* ---- Title / note link ---- */

            const titleEl = card.createEl("div", {
                cls: "kg-prescription-title",
            });
            const link = titleEl.createEl("a", {
                text: formatEmoji(emoji, "📄", file.basename),
                cls: "kg-note-link",
                href: "#",
            });
            // 【修正3】addEventListener の callback から async を除去。
            //  openFile() の Promise を void で明示的に無視する。
            link.addEventListener("click", (e) => {
                e.preventDefault();
                this.close();
                void this.app.workspace.getLeaf(false).openFile(file);
            });

            /* ---- Diagnosis message ---- */

            if (topDiagnosis.message) {
                card.createEl("div", {
                    text: topDiagnosis.message,
                    cls: "kg-prescription-message",
                });
            }

            /* ---- Suggested action ---- */

            if (topDiagnosis.nextAction) {
                const actionEl = card.createEl("div", {
                    cls: "kg-prescription-action",
                });
                actionEl.createEl("span", {
                    text: "→ ",
                    cls: "kg-action-arrow",
                });
                actionEl.createEl("span", {
                    text: topDiagnosis.nextAction.description,
                });

                if (topDiagnosis.nextAction.why) {
                    card.createEl("div", {
                        text: formatEmoji(
                            emoji,
                            "💡",
                            topDiagnosis.nextAction.why
                        ),
                        cls: "kg-prescription-why",
                    });
                }
            }

            /* ---- Quick action buttons ---- */

            const { canMoveInbox, canArchive } =
                this.getQuickActionFlags(item);
            if (canMoveInbox || canArchive) {
                const quickActionsEl = card.createEl("div", {
                    cls: "kg-card-quick-actions",
                });
                this.renderCardQuickActions(
                    quickActionsEl,
                    card,
                    file,
                    canMoveInbox,
                    canArchive
                );
            }

            /* ---- Divider between cards ---- */

            if (i < this.prescriptions.length - 1) {
                card.createEl("hr", { cls: "kg-prescription-divider" });
            }
        }
    }

    // 【修正6】onClose に async は付与されていないことを確認済み（変更不要）
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /* ================================================================
     *  Quick action flag resolution
     * ================================================================ */

    private getQuickActionFlags(item: PrescriptionItem): {
        canMoveInbox: boolean;
        canArchive: boolean;
    } {
        let canMoveInbox = false;
        let canArchive = false;

        for (const d of item.noteDiagnosis.diagnoses) {
            if (
                d.metric === "inbox-staleness" &&
                d.level === "critical"
            ) {
                canMoveInbox = true;
            }
            if (d.metric === "maturity" && d.level === "critical") {
                canArchive = true;
            }
        }

        return { canMoveInbox, canArchive };
    }

    /* ================================================================
     *  Quick action button rendering
     * ================================================================ */

    private renderCardQuickActions(
        container: HTMLElement,
        card: HTMLElement,
        file: TFile,
        canMoveInbox: boolean,
        canArchive: boolean
    ): void {
        if (canMoveInbox) {
            const permBtn = container.createEl("button", {
                text: "→ Permanent",
                cls: "kg-quick-action-btn",
            });
            // 【修正3】addEventListener の callback から async を除去。
            //  await が必要な処理は async IIFE でラップし void で無視する。
            permBtn.addEventListener("click", () => {
                void (async () => {
                    const success = await this.moveToFolder(
                        file,
                        this.settings.permanentFolder,
                        "permanent"
                    );
                    if (success) {
                        new Notice(
                            `Moved "${file.basename}" to ${this.settings.permanentFolder}`
                        );
                        this.markCardDone(
                            container,
                            card,
                            "Moved to Permanent"
                        );
                    }
                })();
            });

            const litBtn = container.createEl("button", {
                text: "→ Literature",
                cls: "kg-quick-action-btn",
            });
            litBtn.addEventListener("click", () => {
                void (async () => {
                    const success = await this.moveToFolder(
                        file,
                        this.settings.literatureFolder,
                        "literature"
                    );
                    if (success) {
                        new Notice(
                            `Moved "${file.basename}" to ${this.settings.literatureFolder}`
                        );
                        this.markCardDone(
                            container,
                            card,
                            "Moved to Literature"
                        );
                    }
                })();
            });
        }

        if (canArchive) {
            const archBtn = container.createEl("button", {
                text: "Archive",
                cls: "kg-quick-action-btn kg-quick-action-archive",
            });
            archBtn.addEventListener("click", () => {
                void (async () => {
                    const success = await this.archiveNote(file);
                    if (success) {
                        new Notice(
                            `Archived "${file.basename}" to ${this.settings.archiveFolder}`
                        );
                        this.markCardDone(container, card, "Archived");
                    }
                })();
            });
        }
    }

    private markCardDone(
        actionsContainer: HTMLElement,
        card: HTMLElement,
        label: string
    ): void {
        actionsContainer.empty();
        actionsContainer.createEl("span", {
            text: `✓ ${label}`,
            cls: "kg-action-done-text",
        });
        card.addClass("kg-card-done");
    }

    /* ================================================================
     *  File operation helpers
     * ================================================================ */

    private async ensureFolderExists(folderPath: string): Promise<void> {
        const existing = this.app.vault.getAbstractFileByPath(folderPath);
        if (!existing) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    private normalizeFolderPath(raw: string): string {
        return raw
            .trim()
            .replace(/^\/+/, "")
            .replace(/\/+$/, "");
    }

    private async moveToFolder(
        file: TFile,
        rawDestFolder: string,
        noteType: string
    ): Promise<boolean> {
        const destFolder = this.normalizeFolderPath(rawDestFolder);
        if (!destFolder) {
            new Notice("Destination folder is not configured.");
            return false;
        }

        const newPath = `${destFolder}/${file.name}`;
        if (this.app.vault.getAbstractFileByPath(newPath)) {
            new Notice(`A file already exists at ${newPath}`);
            return false;
        }

        try {
            await this.ensureFolderExists(destFolder);
            await this.app.fileManager.renameFile(file, newPath);
            // 【修正1】processFrontMatter の callback 引数に
            //  Record<string, unknown> を明示して any 推論を回避
            await this.app.fileManager.processFrontMatter(
                file,
                (fm: Record<string, unknown>) => {
                    fm.type = noteType;
                }
            );
            return true;
        } catch (e: unknown) {
            console.error("[Knowledge Gardener] Move failed:", e);
            new Notice(
                `Failed to move: ${e instanceof Error ? e.message : String(e)}`
            );
            return false;
        }
    }

    private async archiveNote(file: TFile): Promise<boolean> {
        const archiveFolder = this.normalizeFolderPath(
            this.settings.archiveFolder
        );
        if (!archiveFolder) {
            new Notice("Archive folder is not configured.");
            return false;
        }

        const newPath = `${archiveFolder}/${file.name}`;
        if (this.app.vault.getAbstractFileByPath(newPath)) {
            new Notice(`A file already exists at ${newPath}`);
            return false;
        }

        try {
            await this.ensureFolderExists(archiveFolder);
            await this.app.fileManager.renameFile(file, newPath);
            await this.app.fileManager.processFrontMatter(
                file,
                (fm: Record<string, unknown>) => {
                    fm.archived = true;
                    fm["health-check"] = "skip";
                }
            );
            return true;
        } catch (e: unknown) {
            console.error("[Knowledge Gardener] Archive failed:", e);
            new Notice(
                `Failed to archive: ${e instanceof Error ? e.message : String(e)}`
            );
            return false;
        }
    }
}