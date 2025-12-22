// src/snippetBase/dateMath.ts

/**
 * Parse date expressions like "today", "2025-12-21", "today+7d", "2025-12-21+1m-3d"
 */
export function parseDateExpr(expr: string, now?: Date): { iso: string; ok: boolean } {
  const nowDate = now || new Date();

  // Normalize: remove spaces, lowercase
  const normalized = expr.replace(/\s+/g, '').toLowerCase();

  try {
    let baseDate: Date;

    // Parse base date
    if (normalized.startsWith('today')) {
      baseDate = new Date(nowDate);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      // Literal date like "2025-12-21"
      const literalMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!literalMatch) throw new Error('Invalid date format');
      baseDate = new Date(literalMatch[1]! + 'T12:00:00'); // Use noon to avoid DST issues
    } else {
      // Check if we have offsets without a base (implicit today)
      if (/^[+-]/.test(normalized)) {
        baseDate = new Date(nowDate);
      } else {
        throw new Error('Invalid base date');
      }
    }

    // Use noon to avoid DST edge cases
    baseDate.setHours(12, 0, 0, 0);

    // Parse offsets
    const offsetRegex = /([+-])(\d+)([dwmy])/g;
    let remaining = normalized.replace(/^(today|\d{4}-\d{2}-\d{2})/, '');

    let match;
    while ((match = offsetRegex.exec(remaining)) !== null) {
      const sign = match[1] === '+' ? 1 : -1;
      const amount = parseInt(match[2]!, 10);
      const unit = match[3]!;

      switch (unit) {
        case 'd':
          baseDate.setDate(baseDate.getDate() + sign * amount);
          break;
        case 'w':
          baseDate.setDate(baseDate.getDate() + sign * amount * 7);
          break;
        case 'm': {
          // Handle month addition with day clamping
          const monthOriginalDay = baseDate.getDate();
          baseDate.setMonth(baseDate.getMonth() + sign * amount);

          // If the day changed, it means we overflowed into the next month
          // Clamp to the last day of the target month
          if (baseDate.getDate() !== monthOriginalDay) {
            baseDate.setDate(0); // Set to last day of previous month
          }
          break;
        }
        case 'y': {
          // Handle year addition with day clamping (for leap year Feb 29)
          const yearOriginalMonth = baseDate.getMonth();
          const yearOriginalDay = baseDate.getDate();
          baseDate.setFullYear(baseDate.getFullYear() + sign * amount);

          // If we had Feb 29 and the year changed, check if we overflowed
          if (yearOriginalMonth === 1 && yearOriginalDay === 29 && baseDate.getDate() !== 29) {
            // We overflowed Feb 29 in a leap year to a non-leap year
            // Set month back to Feb, then set day to 28
            baseDate.setMonth(1); // February (0-indexed)
            baseDate.setDate(28);
          }
          break;
        }
        default:
          throw new Error(`Unknown unit: ${unit}`);
      }
    }

    // If we have remaining characters that aren't offsets, it's invalid
    const cleanRemaining = remaining.replace(offsetRegex, '');
    if (cleanRemaining.length > 0) {
      throw new Error(`Invalid characters: ${cleanRemaining}`);
    }

    // Format as YYYY-MM-DD
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');

    return { iso: `${year}-${month}-${day}`, ok: true };

  } catch (error) {
    console.warn(`[SnippetBase] Invalid date expression "${expr}":`, error);
    // Fallback to today
    const fallback = new Date(nowDate);
    fallback.setHours(12, 0, 0, 0);
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return { iso: `${year}-${month}-${day}`, ok: false };
  }
}
