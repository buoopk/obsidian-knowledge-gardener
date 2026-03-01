import { ItemView, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import type KnowledgeGardenerPlugin from "./main";
import {
    GardenReport,
    Lang,
    PrescriptionItem,
    VIEW_TYPE_KG_DASHBOARD,
} from "./types";
import { formatEmoji, resolveLang, t } from "./i18n";

export class KGDashboardView extends ItemView {
    private plugin: KnowledgeGardenerPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: KnowledgeGardenerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_KG_DASHBOARD;
    }

    getDisplayText(): string {
        return "Knowledge Gardener";
    }

    getIcon(): string {
        return "heart-pulse";
    }

    async onOpen(): Promise<void> {
        await this.refresh();
    }

    async onClose(): Promise<void> {
        this.contentEl.empty();
    }

    /* ================================================================
     *  Public — called by main.ts when re-revealing an existing leaf
     * ================================================================ */

    async refresh(): Promise<void> {
        const { contentEl } = this;
        const lang = resolveLang(this.plugin.settings.language);
        const emoji = this.plugin.settings.enableEmoji;

        contentEl.empty();
        contentEl.addClass("kg-dashboard");

        contentEl.createEl("div", {
            text: t(lang, "notice.scanning", undefined, emoji),
            cls: "kg-dashboard-loading",
        });

        try {
            const report = await this.plugin.performScan();
            const prescriptions = this.plugin.buildPrescriptions(report);

            contentEl.empty();
            contentEl.addClass("kg-dashboard");
            this.renderDashboard(
                contentEl,
                report,
                prescriptions,
                lang,
                emoji
            );
        } catch (error) {
            contentEl.empty();
            contentEl.addClass("kg-dashboard");
            contentEl.createEl("div", {
                text: "Failed to scan vault. Check the console for details.",
                cls: "kg-dashboard-error",
            });
            console.error(
                "[Knowledge Gardener] Dashboard scan error:",
                error
            );
        }
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
            // Obsidian types processFrontMatter callback param as `any`
            await this.app.fileManager.processFrontMatter(file, (fm) => {
                fm.type = noteType;
            });
            return true;
        } catch (e) {
            console.error("[Knowledge Gardener] Move failed:", e);
            new Notice(
                `Failed to move: ${e instanceof Error ? e.message : String(e)}`
            );
            return false;
        }
    }

    private async archiveNote(file: TFile): Promise<boolean> {
        const archiveFolder = this.normalizeFolderPath(
            this.plugin.settings.archiveFolder
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
            // Obsidian types processFrontMatter callback param as `any`
            await this.app.fileManager.processFrontMatter(file, (fm) => {
                fm.archived = true;
                fm["health-check"] = "skip";
            });
            return true;
        } catch (e) {
            console.error("[Knowledge Gardener] Archive failed:", e);
            new Notice(
                `Failed to archive: ${e instanceof Error ? e.message : String(e)}`
            );
            return false;
        }
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
     *  Rendering
     * ================================================================ */

    private renderDashboard(
        container: HTMLElement,
        report: GardenReport,
        prescriptions: PrescriptionItem[],
        lang: Lang,
        emoji: boolean
    ): void {
        /* ---- Header ---- */
        const header = container.createEl("div", {
            cls: "kg-dashboard-header",
        });
        header.createEl("h4", {
            text: formatEmoji(emoji, "🌱", "Knowledge Gardener"),
            cls: "kg-dashboard-title",
        });

        const actions = header.createEl("div", {
            cls: "kg-dashboard-actions",
        });
        const refreshBtn = actions.createEl("button", {
            cls: "kg-dashboard-refresh-btn clickable-icon",
            attr: { "aria-label": "Refresh" },
        });
        setIcon(refreshBtn, "refresh-cw");
        refreshBtn.addEventListener("click", () => this.refresh());

        /* ---- Summary ---- */
        this.renderSummary(container, report, emoji);

        /* ---- Prescription list ---- */
        if (prescriptions.length === 0) {
            container.createEl("div", {
                text: t(lang, "modal.empty", undefined, emoji),
                cls: "kg-dashboard-empty",
            });
            return;
        }

        container.createEl("div", {
            text: `${prescriptions.length} actionable ${prescriptions.length === 1 ? "item" : "items"}`,
            cls: "kg-dashboard-count",
        });

        this.renderTable(container, prescriptions, emoji);
    }

    /* ---- Summary badges ---- */

    private renderSummary(
        container: HTMLElement,
        report: GardenReport,
        emoji: boolean
    ): void {
        const summary = container.createEl("div", {
            cls: "kg-dashboard-summary",
        });

        const maturityRow = summary.createEl("div", {
            cls: "kg-dashboard-summary-row",
        });
        this.addBadge(
            maturityRow,
            formatEmoji(emoji, "🌱", "Seed"),
            report.maturityCounts.Seed,
            "kg-maturity-seed"
        );
        this.addBadge(
            maturityRow,
            formatEmoji(emoji, "🌿", "Sprout"),
            report.maturityCounts.Sprout,
            "kg-maturity-sprout"
        );
        this.addBadge(
            maturityRow,
            formatEmoji(emoji, "🌲", "Evergreen"),
            report.maturityCounts.Evergreen,
            "kg-maturity-evergreen"
        );
        this.addBadge(
            maturityRow,
            formatEmoji(emoji, "💀", "Dead"),
            report.maturityCounts.Dead,
            "kg-maturity-dead"
        );

        const issueRow = summary.createEl("div", {
            cls: "kg-dashboard-summary-row",
        });
        this.addBadge(
            issueRow,
            formatEmoji(emoji, "🔗", "Orphans"),
            report.orphanCount,
            "kg-stat-orphan"
        );
        this.addBadge(
            issueRow,
            formatEmoji(emoji, "📥", "Stale"),
            report.staleInboxCount,
            "kg-stat-stale"
        );
        this.addBadge(
            issueRow,
            "Scanned",
            report.scannedFiles,
            "kg-stat-scanned"
        );
    }

    private addBadge(
        parent: HTMLElement,
        label: string,
        count: number,
        cls: string
    ): void {
        const badge = parent.createEl("span", {
            cls: `kg-stat-badge ${cls}`,
        });
        badge.createEl("span", { text: label, cls: "kg-stat-label" });
        badge.createEl("span", {
            text: String(count),
            cls: "kg-stat-count",
        });
    }

    /* ---- Item table ---- */

    private renderTable(
        container: HTMLElement,
        prescriptions: PrescriptionItem[],
        emoji: boolean
    ): void {
        const wrapper = container.createEl("div", {
            cls: "kg-dashboard-table-wrapper",
        });
        const table = wrapper.createEl("table", {
            cls: "kg-dashboard-table",
        });

        const thead = table.createEl("thead");
        const hr = thead.createEl("tr");
        hr.createEl("th", { cls: "kg-th-level" });
        hr.createEl("th", { text: "Note", cls: "kg-th-note" });
        hr.createEl("th", { text: "Diagnosis", cls: "kg-th-diagnosis" });
        hr.createEl("th", { text: "Suggested", cls: "kg-th-action" });
        hr.createEl("th", { cls: "kg-th-actions" });

        const tbody = table.createEl("tbody");
        for (const item of prescriptions) {
            this.renderRow(tbody, item, emoji);
        }
    }

    private renderRow(
        tbody: HTMLElement,
        item: PrescriptionItem,
        emoji: boolean
    ): void {
        const { noteDiagnosis, topDiagnosis } = item;
        const row = tbody.createEl("tr", { cls: "kg-dashboard-row" });

        /* Level dot */
        const levelCell = row.createEl("td", { cls: "kg-td-level" });
        levelCell.createEl("span", {
            cls: `kg-level-dot kg-level-${topDiagnosis.level}`,
        });

        /* Note link */
        const noteCell = row.createEl("td", { cls: "kg-td-note" });
        const link = noteCell.createEl("a", {
            text: formatEmoji(emoji, "📄", noteDiagnosis.file.basename),
            cls: "kg-dashboard-note-link",
            href: "#",
        });
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            await this.openNote(noteDiagnosis.file);
        });

        /* Maturity chip */
        noteCell.createEl("span", {
            text: noteDiagnosis.maturity,
            cls: `kg-maturity-chip kg-maturity-chip-${noteDiagnosis.maturity.toLowerCase()}`,
        });

        /* Diagnosis message */
        row.createEl("td", {
            text: topDiagnosis.message,
            cls: "kg-td-diagnosis",
        });

        /* Action description */
        row.createEl("td", {
            text: topDiagnosis.nextAction?.description ?? "",
            cls: "kg-td-action",
        });

        /* Actions cell (quick actions + open) */
        const actionsCell = row.createEl("td", { cls: "kg-td-actions" });
        this.renderRowQuickActions(actionsCell, item);

        const openBtn = actionsCell.createEl("button", {
            cls: "kg-dashboard-open-btn clickable-icon",
            attr: { "aria-label": "Open note" },
        });
        setIcon(openBtn, "external-link");
        openBtn.addEventListener("click", async () => {
            await this.openNote(noteDiagnosis.file);
        });
    }

    /* ---- Row quick action buttons ---- */

    private renderRowQuickActions(
        cell: HTMLElement,
        item: PrescriptionItem
    ): void {
        const { canMoveInbox, canArchive } = this.getQuickActionFlags(item);
        if (!canMoveInbox && !canArchive) return;

        const wrapper = cell.createEl("span", {
            cls: "kg-row-quick-actions",
        });
        const file = item.noteDiagnosis.file;

        if (canMoveInbox) {
            const permBtn = wrapper.createEl("button", {
                text: "→ Permanent",
                cls: "kg-quick-action-btn",
                attr: { "aria-label": "Move to Permanent folder" },
            });
            permBtn.addEventListener("click", async () => {
                const success = await this.moveToFolder(
                    file,
                    this.plugin.settings.permanentFolder,
                    "permanent"
                );
                if (success) {
                    new Notice(
                        `Moved "${file.basename}" to ${this.plugin.settings.permanentFolder}`
                    );
                    await this.refresh();
                }
            });

            const litBtn = wrapper.createEl("button", {
                text: "→ Literature",
                cls: "kg-quick-action-btn",
                attr: { "aria-label": "Move to Literature folder" },
            });
            litBtn.addEventListener("click", async () => {
                const success = await this.moveToFolder(
                    file,
                    this.plugin.settings.literatureFolder,
                    "literature"
                );
                if (success) {
                    new Notice(
                        `Moved "${file.basename}" to ${this.plugin.settings.literatureFolder}`
                    );
                    await this.refresh();
                }
            });
        }

        if (canArchive) {
            const archBtn = wrapper.createEl("button", {
                text: "Archive",
                cls: "kg-quick-action-btn kg-quick-action-archive",
                attr: { "aria-label": "Archive this note" },
            });
            archBtn.addEventListener("click", async () => {
                const success = await this.archiveNote(file);
                if (success) {
                    new Notice(
                        `Archived "${file.basename}" to ${this.plugin.settings.archiveFolder}`
                    );
                    await this.refresh();
                }
            });
        }
    }

    /* ================================================================
     *  Open note in a leaf that is NOT the dashboard
     * ================================================================ */

    private async openNote(file: TFile): Promise<void> {
        const activeLeaf = this.app.workspace.getLeaf(false);
        const targetLeaf =
            activeLeaf === this.leaf
                ? this.app.workspace.getLeaf(true)
                : activeLeaf;
        await targetLeaf.openFile(file);
    }
}