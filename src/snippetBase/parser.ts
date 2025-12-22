// src/snippetbase/parser.ts

export type HeadingPath = string[];

export interface ParsedSnippet {
  language: string;          // "sql", "bash", "" -> normalized later
  startLine: number;         // 0-based
  endLine: number;           // 0-based (inclusive)
  headingPath: HeadingPath;  // ["Projects", "Athena", "Queries"]
  content: string;           // raw body inside fence (no backticks)
}

/**
 * Fast line-based fenced code block extraction.
 * Supports ``` and ~~~ fences. No full AST.
 */
export function parseFencedCodeBlocks(markdown: string): ParsedSnippet[] {
  const lines = markdown.split(/\r?\n/);

  const snippets: ParsedSnippet[] = [];

  // Track H1/H2/H3 chain
  const heading: { [level: number]: string } = {};
  const currentHeadingPath = (): HeadingPath => {
    const path: string[] = [];
    for (const level of [1, 2, 3]) {
      const v = heading[level];
      if (v) path.push(v);
    }
    return path;
  };

  let inFence = false;
  let fenceChar: "`" | "~" | null = null;
  let fenceLen = 0;
  let fenceLang = "";
  let fenceStartLine = -1;
  let fenceBodyStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Heading tracking (only when not inside a fence)
    if (!inFence) {
      // Match "# Heading", "## Heading", "### Heading"
      const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
      if (m && m[1] && m[2]) {
        const level = m[1].length;
        const text = m[2].trim();

        heading[level] = text;
        // clear deeper levels
        for (const deeper of [level + 1, level + 2, level + 3]) {
          delete heading[deeper];
        }
        continue;
      }
    }

    // Fence open/close detection
    const fenceOpen = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line);
    if (!inFence) {
      if (fenceOpen && fenceOpen[2]) {
        const fenceSeq = fenceOpen[2];
        const first = fenceSeq[0] as "`" | "~";
        fenceChar = first;
        fenceLen = fenceSeq.length;

        // language = first token after fence
        const info = (fenceOpen[3] ?? "").trim();
        fenceLang = info.split(/\s+/)[0] ?? "";

        inFence = true;
        fenceStartLine = i;
        fenceBodyStartLine = i + 1;
      }
      continue;
    } else {
      // closing fence must match char and length >= opening length
      if (fenceChar) {
        const closeRe = new RegExp(`^\\s*\\${fenceChar}{${fenceLen},}\\s*$`);
        if (closeRe.test(line)) {
        const bodyLines = lines.slice(fenceBodyStartLine, i);
        snippets.push({
          language: fenceLang,
          startLine: fenceStartLine,
          endLine: i,
          headingPath: currentHeadingPath(),
          content: bodyLines.join("\n"),
        });

        // reset
        inFence = false;
        fenceChar = null;
        fenceLen = 0;
        fenceLang = "";
        fenceStartLine = -1;
        fenceBodyStartLine = -1;
        }
      }
      continue;
    }
  }

  return snippets;
}