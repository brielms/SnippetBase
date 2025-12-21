// src/snippetbase/indexer.ts

import type { App, TFile } from "obsidian";
import { parseFencedCodeBlocks, type HeadingPath } from "./parser";

export interface SnippetRecord {
  id: string;
  notePath: string;
  startLine: number;
  endLine: number;
  language: string;
  headingPath: HeadingPath;
  content: string; // MVP: store full content; later we can lazy-load
  contentHash: string;
  autoName: string;
}

function normalizeLanguage(langRaw: string): string {
  const lang = (langRaw ?? "").trim().toLowerCase();
  if (!lang) return "text";
  if (lang === "sh") return "bash";
  if (lang === "ps") return "powershell";
  if (lang === "py") return "python";
  if (lang === "js") return "javascript";
  return lang;
}

// Fast stable hash (FNV-1a)
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function makeId(notePath: string, startLine: number, endLine: number, contentHash: string): string {
  return `${fnv1a(notePath)}:${startLine}-${endLine}:${contentHash}`;
}

function autoNameFrom(notePath: string, language: string, headingPath: HeadingPath): string {
  const lastHeading = headingPath[headingPath.length - 1];
  if (lastHeading) return lastHeading;
  const fileName = notePath.split("/").pop() ?? notePath;
  return `${language} snippet @ ${fileName}`;
}

export class SnippetIndexer {
  private byFile = new Map<string, SnippetRecord[]>();
  private flat: SnippetRecord[] = [];

  getAll(): SnippetRecord[] {
    return this.flat;
  }

  async rebuild(app: App): Promise<SnippetRecord[]> {
    this.byFile.clear();

    const files = app.vault.getMarkdownFiles();
    for (const file of files) {
      const recs = await this.indexFile(app, file);
      this.byFile.set(file.path, recs);
    }

    this.rebuildFlat();
    return this.flat;
  }

  async updateFile(app: App, file: TFile): Promise<void> {
    const recs = await this.indexFile(app, file);
    this.byFile.set(file.path, recs);
    this.rebuildFlat();
  }

  removeFile(path: string): void {
    this.byFile.delete(path);
    this.rebuildFlat();
  }

  // Called on rename; simplest is: drop old path, index new path
  async renameFile(app: App, file: TFile, oldPath: string): Promise<void> {
    this.byFile.delete(oldPath);
    await this.updateFile(app, file);
  }

  private rebuildFlat(): void {
    const next: SnippetRecord[] = [];
    for (const recs of this.byFile.values()) next.push(...recs);
    this.flat = next;
  }

  private async indexFile(app: App, file: TFile): Promise<SnippetRecord[]> {
    const text = await app.vault.cachedRead(file);
    const parsed = parseFencedCodeBlocks(text);

    const out: SnippetRecord[] = [];
    for (const p of parsed) {
      const language = normalizeLanguage(p.language);
      const contentHash = fnv1a(language + "\n" + p.content);

      const id = makeId(file.path, p.startLine, p.endLine, contentHash);
      const autoName = autoNameFrom(file.path, language, p.headingPath);

      out.push({
        id,
        notePath: file.path,
        startLine: p.startLine,
        endLine: p.endLine,
        language,
        headingPath: p.headingPath,
        content: p.content,
        contentHash,
        autoName,
      });
    }

    return out;
  }
}
