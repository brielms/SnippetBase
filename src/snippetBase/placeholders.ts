// src/snippetBase/placeholders.ts

import { parseDateExpr } from "./dateMath";

export interface PlaceholderSpec {
  key: string;
  type: 'text' | 'select' | 'date';
  label: string;
  defaultValue?: string;
  options?: string[]; // for select type
  original: string; // the full placeholder content like "temp:a|c|r"
  prefillSource: 'explicit-default' | 'computed' | 'history' | 'empty';
  sourceHint: string;
}

export interface PlaceholderValues {
  [key: string]: string;
}

/**
 * Extract placeholders from text and return deduplicated specs ordered by first appearance
 */
export function extractPlaceholders(text: string): PlaceholderSpec[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const seen = new Set<string>();
  const specs: PlaceholderSpec[] = [];

  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    const content = match[1]!.trim();

    // Skip if already processed
    if (seen.has(content)) continue;
    seen.add(content);

    const spec = parsePlaceholder(content);
    if (spec) {
      specs.push(spec);
    }
  }

  return specs;
}

/**
 * Parse a single placeholder content into a spec
 */
function parsePlaceholder(content: string): PlaceholderSpec | null {
  // Date placeholder: {{date:EXPR}}
  if (content.startsWith('date:')) {
    const expr = content.substring(5).trim();
    if (!expr) return null;

    const { iso: defaultValue } = parseDateExpr(expr);

    // Determine if this is a computed expression or explicit default
    const isLiteralDate = /^\d{4}-\d{2}-\d{2}$/.test(expr);
    const prefillSource = isLiteralDate ? 'explicit-default' : 'computed';
    const sourceHint = isLiteralDate ? `default: ${expr}` : `from ${expr.replace(/\s+/g, '')}`;

    return {
      key: content,
      type: 'date',
      label: expr, // Show the expression as the label
      defaultValue,
      original: content,
      prefillSource,
      sourceHint,
    };
  }

  // Select placeholder: {{key:option1|option2|option3}}
  const colonIndex = content.indexOf(':');
  if (colonIndex > 0) {
    const key = content.substring(0, colonIndex).trim();
    const optionsPart = content.substring(colonIndex + 1).trim();

    if (key && optionsPart) {
      const options = optionsPart.split('|').map(opt => opt.trim()).filter(opt => opt);
      if (options.length > 0) {
        return {
          key,
          type: 'select',
          label: key,
          options,
          original: content,
          prefillSource: 'empty',
          sourceHint: '',
        };
      }
    }
  }

  // Text placeholder with default: {{key=default}}
  const equalsIndex = content.indexOf('=');
  if (equalsIndex > 0) {
    const key = content.substring(0, equalsIndex).trim();
    const defaultValue = content.substring(equalsIndex + 1).trim();

    if (key) {
      return {
        key,
        type: 'text',
        label: key,
        defaultValue,
        original: content,
        prefillSource: 'explicit-default',
        sourceHint: `default: ${defaultValue}`,
      };
    }
  }

  // Simple text placeholder: {{key}}
  const key = content.trim();
  if (key) {
    return {
      key,
      type: 'text',
      label: key,
      original: content,
      prefillSource: 'empty',
      sourceHint: '',
    };
  }

  return null;
}

/**
 * Apply placeholder values to text, replacing all occurrences
 */
export function applyPlaceholders(text: string, values: PlaceholderValues, specs: PlaceholderSpec[]): string {
  let result = text;

  for (const spec of specs) {
    const value = values[spec.key];
    if (value !== undefined) {
      // Escape special regex characters in the original placeholder for replacement
      const escapedOriginal = spec.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedOriginal}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }

  return result;
}

