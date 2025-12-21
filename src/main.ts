// src/main.ts

import { App, Modal, Notice, Plugin, TFile } from "obsidian";
import { SnippetIndexer } from "./snippetBase/indexer";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { SnippetBaseView, VIEW_TYPE_SNIPPETBASE } from "./ui/SnippetBaseView";

export default class SnippetBasePlugin extends Plugin {
  settings: MyPluginSettings;

  private indexer = new SnippetIndexer();
  private reindexTimers = new Map<string, number>();

  getAllSnippets() {
    return this.indexer.getAll();
  }

  async rebuildIndex() {
    this.startIndexing();
    try {
      const records = await this.indexer.rebuild(this.app);
      this.cleanupStaleFavorites();
      this.finishIndexing(records.length);
      return records;
    } catch (e) {
      this.updateIndexStatus({ isIndexing: false });
      throw e;
    }
  }

  async openSnippetBase(where: "tab" | "right" = "tab") {
    const leaf =
      where === "right"
        ? this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab")
        : this.app.workspace.getLeaf("tab");

    await leaf.setViewState({ type: VIEW_TYPE_SNIPPETBASE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private isMarkdownFile(file: unknown): file is TFile {
    return file instanceof TFile && file.extension === "md";
  }

  private scheduleReindex(file: TFile) {
    const key = file.path;
    const existing = this.reindexTimers.get(key);
    if (existing) window.clearTimeout(existing);

    // Mark as indexing during incremental updates
    if (Object.keys(this.reindexTimers).length === 0) {
      this.startIndexing();
    }

    const handle = window.setTimeout(async () => {
      try {
        await this.indexer.updateFile(this.app, file);
        this.cleanupStaleFavorites();

        // Update status if this was the last pending reindex
        if (this.reindexTimers.size === 1) {
          const totalSnippets = this.indexer.getAll().length;
          this.finishIndexing(totalSnippets);
        }
      } catch (e) {
        console.error("[SnippetBase] incremental index failed:", e);
        if (this.reindexTimers.size === 1) {
          this.updateIndexStatus({ isIndexing: false });
        }
      } finally {
        this.reindexTimers.delete(key);
      }
    }, 250);

    this.reindexTimers.set(key, handle);
  }

  private refreshSnippetBaseViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SNIPPETBASE);
    for (const leaf of leaves) {
      const v = leaf.view as any;
      if (typeof v.refresh === "function") v.refresh();
    }
  }

  // Favorites management
  isFavorite(snippetId: string): boolean {
    return !!this.settings.favorites[snippetId];
  }

  toggleFavorite(snippetId: string): void {
    if (this.isFavorite(snippetId)) {
      delete this.settings.favorites[snippetId];
    } else {
      this.settings.favorites[snippetId] = true;
    }
    this.saveSettings();
    this.refreshSnippetBaseViews();
  }

  cleanupStaleFavorites(): void {
    const allSnippetIds = new Set(this.indexer.getAll().map(r => r.id));
    const cleanedFavorites: Record<string, true> = {};

    for (const id of Object.keys(this.settings.favorites)) {
      if (allSnippetIds.has(id)) {
        cleanedFavorites[id] = true;
      }
    }

    this.settings.favorites = cleanedFavorites;
  }

  // Index status management
  getIndexStatus() {
    return this.settings.indexStatus;
  }

  updateIndexStatus(updates: Partial<MyPluginSettings['indexStatus']>) {
    Object.assign(this.settings.indexStatus, updates);
    this.saveSettings();
    this.refreshSnippetBaseViews();
  }

  startIndexing() {
    this.updateIndexStatus({ isIndexing: true });
  }

  finishIndexing(totalSnippets: number) {
    this.updateIndexStatus({
      isIndexing: false,
      totalSnippets,
      lastUpdated: Date.now(),
    });
  }

  async onload() {
    await this.loadSettings();

    // Settings UI (keep if you already started customizing it)
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // View registration
    this.registerView(VIEW_TYPE_SNIPPETBASE, (leaf) => new SnippetBaseView(leaf, this));

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!this.isMarkdownFile(file)) return;
        this.scheduleReindex(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        // delete events provide the old path; file may be TFile or abstract
        const path = (file as any)?.path;
        if (!path) return;
        this.indexer.removeFile(path);
        this.cleanupStaleFavorites();
        const totalSnippets = this.indexer.getAll().length;
        this.updateIndexStatus({
          totalSnippets,
          lastUpdated: Date.now(),
        });
        this.refreshSnippetBaseViews();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (!this.isMarkdownFile(file)) return;
        // drop old path, index new path
        void this.indexer.renameFile(this.app, file, oldPath);
        const totalSnippets = this.indexer.getAll().length;
        this.updateIndexStatus({
          totalSnippets,
          lastUpdated: Date.now(),
        });
        this.refreshSnippetBaseViews();
      })
    );

    // Sanity log so you can confirm reloads
    console.log("[SnippetBase] loaded");

    // Commands
    this.addCommand({
      id: "snippetbase-rebuild-index",
      name: "SnippetBase: Rebuild snippet index",
      callback: async () => {
        const t0 = performance.now();
        const recs = await this.indexer.rebuild(this.app);
        const ms = Math.round(performance.now() - t0);

        new Notice(`SnippetBase indexed ${recs.length} snippets (${ms} ms)`);
        console.log("[SnippetBase] indexed", recs.length, "snippets");
      },
    });

    this.addCommand({
      id: "snippetbase-log-sample",
      name: "SnippetBase: Log first 3 snippets",
      callback: () => {
        const recs = this.indexer.getAll().slice(0, 3);
        console.log("[SnippetBase] sample snippets", recs);
        new Notice(`Logged ${recs.length} snippets to console`);
      },
    });

    this.addCommand({
      id: "snippetbase-open-tab",
      name: "SnippetBase: Open (tab)",
      callback: async () => {
        await this.openSnippetBase("tab");
        this.settings.openLocation = "tab";
        this.settings.reopenOnStartup = true;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: "snippetbase-open-right",
      name: "SnippetBase: Open (right sidebar)",
      callback: async () => {
        await this.openSnippetBase("right");
        this.settings.openLocation = "right";
        this.settings.reopenOnStartup = true;
        await this.saveSettings();
      },
    });

    this.addRibbonIcon("code-2", "Open SnippetBase", async () => {
      await this.openSnippetBase("tab");
    });

    // Optional: build index on load (nice proof-of-life)
    // Comment out if you prefer manual rebuilds during dev.
    setTimeout(async () => {
      try {
        const recs = await this.indexer.rebuild(this.app);
        console.log("[SnippetBase] initial index:", recs.length);
      } catch (e) {
        console.error("[SnippetBase] initial index failed", e);
      }
    }, 300);

    if (this.settings.reopenOnStartup) {
      // wait for workspace to be ready
      this.app.workspace.onLayoutReady(async () => {
        await this.openSnippetBase(this.settings.openLocation ?? "tab");
      });
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SNIPPETBASE);
    console.log("[SnippetBase] unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<MyPluginSettings>
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// Keep this only if you're still using it for quick tests.
// You can delete it later.
class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    this.contentEl.setText("Woah!");
  }

  onClose() {
    this.contentEl.empty();
  }
}
