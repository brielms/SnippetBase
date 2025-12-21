// src/main.ts

import { Notice, Plugin, TFile } from "obsidian";
import { SnippetIndexer } from "./snippetBase/indexer";
import { DEFAULT_SETTINGS, SnippetBaseSettings, SnippetBaseSettingTab } from "./settings";
import { SnippetBaseView, VIEW_TYPE_SNIPPETBASE } from "./ui/SnippetBaseView";

export default class SnippetBasePlugin extends Plugin {
  settings: SnippetBaseSettings;

  private indexer = new SnippetIndexer();
  private reindexTimers = new Map<string, number>();
  private saveDebounceTimer: number | null = null;

  getAllSnippets() {
    return this.indexer.getAll();
  }

  async rebuildIndex() {
    await this.startIndexing();
    try {
      const records = await this.indexer.rebuild(this.app);
      this.cleanupStaleFavorites();
      await this.finishIndexing(records.length);
      return records;
    } catch (e) {
      await this.updateIndexStatus({ isIndexing: false });
      throw e;
    }
  }

  async openSnippetBase(where: "tab" | "right" = "tab") {
    const leaf =
      where === "right"
        ? this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab")
        : this.app.workspace.getLeaf("tab");

    await leaf.setViewState({ type: VIEW_TYPE_SNIPPETBASE, active: true });
    void this.app.workspace.revealLeaf(leaf);
  }

  private isMarkdownFile(file: unknown): file is TFile {
    return file instanceof TFile && file.extension === "md";
  }

  private scheduleReindex(file: TFile) {
    const key = file.path;
    const existing = this.reindexTimers.get(key);
    if (existing) window.clearTimeout(existing);

    // Mark as indexing during incremental updates
    if (this.reindexTimers.size === 0) {
      void this.startIndexing();
    }

    const handle = window.setTimeout(() => {
      void this.indexer.updateFile(this.app, file).then(() => {
        this.cleanupStaleFavorites();

        // Update status if this was the last pending reindex
        if (this.reindexTimers.size === 1) {
          const totalSnippets = this.indexer.getAll().length;
          void this.finishIndexing(totalSnippets);
        }
      }).catch(async (e) => {
        console.error("[SnippetBase] incremental index failed:", e);
        if (this.reindexTimers.size === 1) {
          await this.updateIndexStatus({ isIndexing: false });
        }
      }).finally(() => {
        this.reindexTimers.delete(key);
      });
    }, 250);

    this.reindexTimers.set(key, handle);
  }

  private refreshSnippetBaseViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SNIPPETBASE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof SnippetBaseView && typeof view.refresh === "function") {
        view.refresh();
      }
    }
  }

  // Favorites management
  isFavorite(snippetId: string): boolean {
    return !!this.settings.favorites[snippetId];
  }

  async toggleFavorite(snippetId: string): Promise<void> {
    if (this.isFavorite(snippetId)) {
      delete this.settings.favorites[snippetId];
    } else {
      this.settings.favorites[snippetId] = true;
    }
    await this.saveSettings();
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
  getIndexStatus(): { totalSnippets: number; lastUpdated: number; isIndexing: boolean } {
    return this.settings.indexStatus;
  }

  async updateIndexStatus(updates: Partial<SnippetBaseSettings['indexStatus']>) {
    Object.assign(this.settings.indexStatus, updates);
    this.refreshSnippetBaseViews();
    this.debouncedSaveSettings();
  }

  private debouncedSaveSettings() {
    if (this.saveDebounceTimer) {
      window.clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = window.setTimeout(() => {
      void this.saveSettings();
      this.saveDebounceTimer = null;
    }, 500);
  }

  async startIndexing() {
    await this.updateIndexStatus({ isIndexing: true });
  }

  async finishIndexing(totalSnippets: number) {
    await this.updateIndexStatus({
      isIndexing: false,
      totalSnippets,
      lastUpdated: Date.now(),
    });
  }

  async onload() {
    await this.loadSettings();

    // Settings UI
    this.addSettingTab(new SnippetBaseSettingTab(this.app, this));

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
        const path = (file as { path?: string })?.path;
        if (!path) return;
        this.indexer.removeFile(path);
        this.cleanupStaleFavorites();
        const totalSnippets = this.indexer.getAll().length;
        void this.updateIndexStatus({
          totalSnippets,
          lastUpdated: Date.now(),
        });
        this.refreshSnippetBaseViews();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (!this.isMarkdownFile(file)) return;
        // drop old path, index new path
        await this.startIndexing();
        try {
          await this.indexer.renameFile(this.app, file, oldPath);
          const totalSnippets = this.indexer.getAll().length;
          await this.finishIndexing(totalSnippets);
          this.refreshSnippetBaseViews();
        } catch (e) {
          console.error("[SnippetBase] rename indexing failed:", e);
          await this.updateIndexStatus({ isIndexing: false });
        }
      })
    );

    // Plugin loaded successfully
    console.debug("[SnippetBase] loaded");

    // Commands
    this.addCommand({
      id: "rebuild-index",
      name: "Rebuild snippet index",
      callback: async () => {
        const t0 = performance.now();
        const recs = await this.rebuildIndex();
        const ms = Math.round(performance.now() - t0);

        new Notice(`Indexed ${recs.length} snippets (${ms} ms)`);
        console.debug("[SnippetBase] indexed", recs.length, "snippets");
      },
    });


    this.addCommand({
      id: "open-tab",
      name: "Open in new tab",
      callback: async () => {
        await this.openSnippetBase("tab");
        this.settings.openLocation = "tab";
        this.settings.reopenOnStartup = true;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: "open-right-sidebar",
      name: "Open in right sidebar",
      callback: async () => {
        await this.openSnippetBase("right");
        this.settings.openLocation = "right";
        this.settings.reopenOnStartup = true;
        await this.saveSettings();
      },
    });

    this.addRibbonIcon("code-2", "Open snippet base", async () => {
      await this.openSnippetBase("tab");
    });

    // Optional: build index on load (nice proof-of-life)
    // Comment out if you prefer manual rebuilds during dev.
    setTimeout(() => {
      void this.rebuildIndex().then((recs) => {
        console.debug("[SnippetBase] initial index:", recs.length);
      }).catch((e) => {
        console.error("[SnippetBase] initial index failed", e);
      });
    }, 300);

    if (this.settings.reopenOnStartup) {
      // wait for workspace to be ready
      this.app.workspace.onLayoutReady(async () => {
        await this.openSnippetBase(this.settings.openLocation ?? "tab");
      });
    }
  }

  onunload() {
    // Cleanup will be handled automatically by Obsidian
    console.debug("[SnippetBase] unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<SnippetBaseSettings>
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

