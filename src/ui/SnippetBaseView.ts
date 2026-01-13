// src/ui/SnippetBaseView.ts

import {
    ItemView,
    WorkspaceLeaf,
    Notice,
    TFile,
    MarkdownView,
    MarkdownRenderer,
  } from "obsidian";

import type SnippetBasePlugin from "../main";
import type { SnippetRecord } from "../snippetBase/indexer";
import { extractPlaceholders, applyPlaceholders, type PlaceholderValues } from "../snippetBase/placeholders";
import { PlaceholderModal } from "./PlaceholderModal";
  
  export const VIEW_TYPE_SNIPPETBASE = "snippetbase-view";
  
  export class SnippetBaseView extends ItemView {
    private plugin: SnippetBasePlugin;
  
    private search = "";
    private langFilter = "all";
    private folderFilter = "all";
    private showFavoritesOnly = false;
    private selectedId: string | null = null;

    // DOM refs
    private listEl!: HTMLDivElement;
    private previewEl!: HTMLDivElement;
    private langSelectEl!: HTMLSelectElement;
    private folderSelectEl!: HTMLSelectElement;
    private searchInputEl!: HTMLInputElement;
    private statusEl!: HTMLDivElement;
  
    constructor(leaf: WorkspaceLeaf, plugin: SnippetBasePlugin) {
      super(leaf);
      this.plugin = plugin;
    }
  
    getViewType(): string {
      return VIEW_TYPE_SNIPPETBASE;
    }
  
    getDisplayText(): string {
      return "Snippet base";
    }
  
    async onOpen() {
      this.containerEl.addClass("snippetbase-root");
      const container = this.containerEl.children[1] as HTMLElement;
      container.empty();
      container.addClass("snippetbase-root");
  
      // Header row
      const header = container.createDiv({ cls: "snippetbase-header" });
      header.createEl("h2", { text: "Snippet base" });
  
      const headerBtns = header.createDiv({ cls: "snippetbase-header-btns" });
  
      const rebuildBtn = headerBtns.createEl("button", { text: "Rebuild index" });
      rebuildBtn.onclick = async () => {
        const t0 = performance.now();
        const recs = await this.plugin.rebuildIndex();
        const ms = Math.round(performance.now() - t0);
        new Notice(`Indexed ${recs.length} snippets (${ms} ms)`);
        this.refresh();
      };
  
      const refreshBtn = headerBtns.createEl("button", { text: "Refresh" });
      refreshBtn.onclick = () => this.refresh();

      // Status line
      this.statusEl = container.createDiv({ cls: "snippetbase-status" });
      this.updateStatusDisplay();

      // Controls row
      const controls = container.createDiv({ cls: "snippetbase-controls" });
  
      this.searchInputEl = controls.createEl("input", {
        type: "text",
        placeholder: "Search snippets… (name, path, heading, body)",
      });
      this.searchInputEl.oninput = () => {
        this.search = this.searchInputEl.value ?? "";
        this.renderList();
      };

      this.folderSelectEl = controls.createEl("select");
      this.folderSelectEl.onchange = () => {
        this.folderFilter = this.folderSelectEl.value;
        this.renderList();
      };

      this.langSelectEl = controls.createEl("select");
      this.langSelectEl.onchange = () => {
        this.langFilter = this.langSelectEl.value;
        this.renderList();
      };

      const favoritesBtn = controls.createEl("button", {
        text: "★ favorites",
        cls: "snippetbase-favorites-btn",
      });
      favoritesBtn.onclick = () => {
        this.showFavoritesOnly = !this.showFavoritesOnly;
        favoritesBtn.setText(this.showFavoritesOnly ? "★ Show all" : "★ Favorites");
        favoritesBtn.toggleClass("is-active", this.showFavoritesOnly);
        this.renderList();
      };

      // Main layout: list (left) + preview (right)
      const main = container.createDiv({ cls: "snippetbase-main" });
  
      this.listEl = main.createDiv({ cls: "snippetbase-list" });
  
      const right = main.createDiv({ cls: "snippetbase-right" });
  
      const actions = right.createDiv({ cls: "snippetbase-actions" });
  
      const copyBtn = actions.createEl("button", { text: "Copy" });
      copyBtn.onclick = async (event) => {
        const rec = this.getSelectedRecord();
        if (!rec) return;

        try {
          const includeFence = event.shiftKey ?? false;
          const text = includeFence ? `\`\`\`${rec.language}\n${rec.content}\n\`\`\`\n` : rec.content;
          await navigator.clipboard.writeText(text);
          new Notice(includeFence ? "Copied snippet with fence" : "Copied snippet");
        } catch (e) {
          console.error("[SnippetBase] clipboard failed", e);
          new Notice("Copy failed (see console)");
        }
      };

      const fillCopyBtn = actions.createEl("button", { text: "Copy (fill…)" });
      fillCopyBtn.onclick = async () => {
        const rec = this.getSelectedRecord();
        if (!rec) return;
        await this.copySnippetWithPlaceholders(rec);
      };
  
      const openBtn = actions.createEl("button", { text: "Open in note" });
      openBtn.onclick = async () => {
        const rec = this.getSelectedRecord();
        if (!rec) return;
        await this.openInContext(rec);
      };
  
      this.previewEl = right.createDiv({ cls: "snippetbase-preview" });
      this.previewEl.setText("Select a snippet…");
  
      // first paint
      this.refresh();
      return Promise.resolve();
    }
  
    async onClose() {
      // nothing special
    }
  
    refresh() {
      this.populateFolderDropdown();
      this.populateLanguageDropdown();
      this.renderList();
      this.renderPreview();
      this.updateStatusDisplay();
    }
  
    private getAllRecords(): SnippetRecord[] {
      return this.plugin.getAllSnippets();
    }
  
    getSelectedRecord(): SnippetRecord | null {
      if (!this.selectedId) return null;
      return this.getAllRecords().find((r) => r.id === this.selectedId) ?? null;
    }
  
    private populateLanguageDropdown() {
      const recs = this.getAllRecords();
      const langs = Array.from(new Set(recs.map((r) => r.language))).sort();
  
      const prev = this.langFilter;
  
      this.langSelectEl.empty();
      this.langSelectEl.createEl("option", { value: "all", text: "All languages" });
      for (const l of langs) {
        this.langSelectEl.createEl("option", { value: l, text: l });
      }
  
      // restore selection if possible
      this.langSelectEl.value = langs.includes(prev) ? prev : "all";
      this.langFilter = this.langSelectEl.value;
    }

    private populateFolderDropdown() {
      const recs = this.getAllRecords();

      // Collect folder paths from notePath
      const folders = new Set<string>();
      for (const r of recs) {
        const idx = r.notePath.lastIndexOf("/");
        const folder = idx >= 0 ? r.notePath.slice(0, idx) : ""; // "" = vault root
        folders.add(folder);
      }

      const sorted = Array.from(folders).sort((a, b) => a.localeCompare(b));

      const prev = this.folderFilter;

      this.folderSelectEl.empty();
      this.folderSelectEl.createEl("option", { value: "all", text: "All folders" });
      // Root option if you want it explicitly:
      this.folderSelectEl.createEl("option", { value: "", text: "(vault root)" });

      for (const f of sorted) {
        if (f === "") continue; // already added root
        this.folderSelectEl.createEl("option", { value: f, text: f });
      }

      // Restore selection if possible
      const values = ["all", "", ...sorted];
      this.folderFilter = values.includes(prev) ? prev : "all";
      this.folderSelectEl.value = this.folderFilter;
    }

    private renderList() {
      const recs = this.filteredRecords();
  
      this.listEl.empty();
  
      if (recs.length === 0) {
        this.listEl.createDiv({ text: "No snippets match." });
        return;
      }
  
      for (const r of recs) {
        const row = this.listEl.createDiv({ cls: "snippetbase-row" });
  
        if (r.id === this.selectedId) row.addClass("is-selected");
  
        const title = row.createDiv({ cls: "snippetbase-row-title" });
        title.setText(r.autoName);

        const actions = row.createDiv({ cls: "snippetbase-row-actions" });

        const starIcon = actions.createEl("span", {
          cls: "snippetbase-row-star",
          text: this.plugin.isFavorite(r.id) ? "★" : "☆",
          title: this.plugin.isFavorite(r.id) ? "Remove from favorites" : "Add to favorites",
        });
        starIcon.onclick = async (e) => {
          e.stopPropagation();
          await this.plugin.toggleFavorite(r.id);
          this.renderList(); // Re-render to update star appearance
        };

        const fillCopyBtn = actions.createEl("button", {
          text: "Copy (fill…)",
          cls: "snippetbase-row-action-btn",
        });
        fillCopyBtn.onclick = async (e) => {
          e.stopPropagation();
          await this.copySnippetWithPlaceholders(r);
        };

        const meta = row.createDiv({ cls: "snippetbase-row-meta" });

        const langEl = meta.createDiv({ cls: "snippetbase-row-lang" });
        langEl.setText(r.language);

        const rightEl = meta.createDiv({ cls: "snippetbase-row-path" });
        const section = r.headingPath?.length ? r.headingPath.join(" / ") : "";
        rightEl.setText(section ? `${r.notePath} • ${section}` : r.notePath);
  
        row.onclick = () => {
          this.selectedId = r.id;
          this.renderList();
          this.renderPreview();
        };
      }
  
      // auto-select first item if none selected
      if (!this.selectedId && recs.length > 0) {
        this.selectedId = recs[0]!.id;
        this.renderList();
        this.renderPreview();
      }
    }

    private fenceWrap(language: string, content: string): string {
      // If snippet contains ``` then use a longer fence delimiter
      const containsTripleBacktick = content.includes("```");
      const fence = containsTripleBacktick ? "````" : "```";
      const lang = (language ?? "").trim();
      return `${fence}${lang}\n${content}\n${fence}\n`;
    }

    private renderPreview() {
      const rec = this.getSelectedRecord();

      this.previewEl.empty();

      if (!rec) {
        this.previewEl.setText("Select a snippet…");
        return;
      }

      // cap preview to keep renderer fast
      const maxLines = 200;
      const lines = rec.content.split(/\r?\n/);
      const truncated = lines.length > maxLines;
      const content = truncated ? lines.slice(0, maxLines).join("\n") : rec.content;

      const md = this.fenceWrap(rec.language, content);

      // Render as Reading-mode markdown (native syntax highlighting)
      void MarkdownRenderer.render(
        this.app,
        md,
        this.previewEl,
        rec.notePath,      // source path for links (not super relevant here)
        this              // view context for lifecycle
      );

      if (truncated) {
        const note = this.previewEl.createDiv({ cls: "snippetbase-trunc" });
        note.setText("…preview truncated");
      }
    }

    private updateStatusDisplay() {
      const status = this.plugin.getIndexStatus();

      let statusText = `${status.totalSnippets} snippets`;

      if (status.isIndexing) {
        statusText += " • Indexing…";
      } else if (status.lastUpdated > 0) {
        const time = new Date(status.lastUpdated).toLocaleTimeString();
        statusText += ` • Updated ${time}`;
      }

      this.statusEl.setText(statusText);
    }
  
    private filteredRecords(): SnippetRecord[] {
      const q = (this.search ?? "").trim().toLowerCase();

      let filtered = this.getAllRecords().filter((r) => {
        // Folder scope: match folder prefix, include subfolders
        if (this.folderFilter !== "all") {
          const prefix = this.folderFilter === "" ? "" : this.folderFilter + "/";
          if (prefix && !r.notePath.startsWith(prefix)) return false;
          if (this.folderFilter === "" && r.notePath.includes("/")) return false; // root only
        }

        if (this.langFilter !== "all" && r.language !== this.langFilter) return false;

        // Favorites filter
        if (this.showFavoritesOnly && !this.plugin.isFavorite(r.id)) return false;

        if (!q) return true;

        const hay = [
          r.autoName,
          r.notePath,
          r.headingPath?.join(" / ") ?? "",
          r.content,
        ]
          .join("\n")
          .toLowerCase();

        return hay.includes(q);
      });

      // Sort favorites to top always
      filtered.sort((a, b) => {
        const aFav = this.plugin.isFavorite(a.id);
        const bFav = this.plugin.isFavorite(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0; // maintain current order for same favorite status
      });

      return filtered;
    }

    private async openInContext(rec: SnippetRecord) {
      const file = this.app.vault.getAbstractFileByPath(rec.notePath);
      if (!(file instanceof TFile)) {
        new Notice("Source file not found");
        return;
      }

      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file);

      // Try to position cursor in editor if we're in a MarkdownView
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        const editor = view.editor;
        const line = Math.max(0, rec.startLine + 1);
        editor.setCursor({ line, ch: 0 });
        editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
      }
    }

    async copySnippetWithPlaceholders(rec: SnippetRecord) {
      const specs = extractPlaceholders(rec.content);

      if (specs.length === 0) {
        // No placeholders, behave like normal copy
        try {
          await navigator.clipboard.writeText(rec.content);
          new Notice("Copied snippet");
        } catch (e) {
          console.error("[SnippetBase] clipboard failed", e);
          new Notice("Copy failed (see console)");
        }
        return;
      }

      // Has placeholders, show modal
      const modal = new PlaceholderModal(
        this.app,
        specs,
        this.plugin.settings.placeholderHistory,
        this.plugin.settings.placeholderUi,
        (values: PlaceholderValues) => {
          try {
            const filledText = applyPlaceholders(rec.content, values, specs);
            // Don't await - fire and forget for clipboard
            navigator.clipboard.writeText(filledText).then(() => {
              new Notice("Copied filled snippet");
            }).catch((e) => {
              console.error("[SnippetBase] clipboard failed", e);
              new Notice("Copy failed (see console)");
            });

            // Update history
            for (const [key, value] of Object.entries(values)) {
              this.plugin.settings.placeholderHistory[key] = value;
            }
            void this.plugin.saveSettings();

          } catch (e) {
            console.error("[SnippetBase] placeholder processing failed", e);
            new Notice("Processing failed (see console)");
          }
        }
      );

      modal.open();
    }
}
  