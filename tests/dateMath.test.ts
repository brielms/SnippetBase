// tests/dateMath.test.ts

import { parseDateExpr } from "../src/snippetBase/dateMath";

// Fixed test date: 2025-12-21T12:00:00
const TEST_NOW = new Date('2025-12-21T12:00:00');

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testDateMath() {
  console.log('Testing date math expressions...');

  // Basic cases
  assert(parseDateExpr('today', TEST_NOW).iso === '2025-12-21', 'today should be 2025-12-21');
  assert(parseDateExpr('+0d', TEST_NOW).iso === '2025-12-21', '+0d should be 2025-12-21');
  assert(parseDateExpr('+1d', TEST_NOW).iso === '2025-12-22', '+1d should be 2025-12-22');
  assert(parseDateExpr('-1d', TEST_NOW).iso === '2025-12-20', '-1d should be 2025-12-20');

  // Weeks
  assert(parseDateExpr('+1w', TEST_NOW).iso === '2025-12-28', '+1w should be 2025-12-28');

  // Complex expressions
  assert(parseDateExpr('today+2w-3d', TEST_NOW).iso === '2026-01-01', 'today+2w-3d should be 2026-01-01');

  // Literal dates with offsets
  assert(parseDateExpr('2025-12-21+1m', TEST_NOW).iso === '2026-01-21', '2025-12-21+1m should be 2026-01-21');

  // Month clamping (January 31st + 1 month = February 28th)
  assert(parseDateExpr('2025-01-31+1m', TEST_NOW).iso === '2025-02-28', '2025-01-31+1m should clamp to 2025-02-28');

  // Leap year clamping (Feb 29 + 1 year = Feb 28)
  assert(parseDateExpr('2024-02-29+1y', TEST_NOW).iso === '2025-02-28', '2024-02-29+1y should clamp to 2025-02-28');

  // Year addition
  assert(parseDateExpr('today+1y', TEST_NOW).iso === '2026-12-21', 'today+1y should be 2026-12-21');

  // Whitespace tolerance
  assert(parseDateExpr('today + 7d', TEST_NOW).iso === '2025-12-28', 'today + 7d should work with spaces');

  // Invalid expressions should fallback to today
  const invalid = parseDateExpr('wat', TEST_NOW);
  assert(invalid.iso === '2025-12-21', 'invalid expr should fallback to today');
  assert(invalid.ok === false, 'invalid expr should have ok=false');

  console.log('All date math tests passed! ✓');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDateMath };
} else {
  testDateMath();
}
