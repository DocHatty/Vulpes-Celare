/**
 * SmartDateFilter - Context-Aware Date Redaction
 *
 * Extends basic date redaction with temporal relationship tracking:
 * - First date becomes DAY_0 (reference point)
 * - Subsequent dates show relative time (DAY_3, DAY_7, etc.)
 * - Preserves chronological relationships while protecting PHI
 *
 * Example:
 *   Basic: "Examined on {{DATE_123}}. Returned on {{DATE_456}}."
 *   Smart: "Examined on {{DATE_123:DAY_0}}. Returned on {{DATE_456:DAY_3}}."
 */

import { BaseFilter } from "../RedactionEngine";
import { RedactionContext } from "../context/RedactionContext";

export class SmartDateFilter extends BaseFilter {
  // Pre-compile regex patterns for performance
  private static readonly DATE_PATTERNS = [
    /\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})\b/g, // MM/DD/YYYY
    /\b(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})\b/g, // YYYY/MM/DD
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})\b/gi,
  ];

  /**
   * Apply smart date redaction with temporal tracking
   */
  async apply(
    text: string,
    config: any,
    context: RedactionContext | RedactionContext,
  ): Promise<string> {
    let result = text;

    // Check if we're using RedactionContext
    const isSmartContext = context instanceof RedactionContext;

    for (const pattern of SmartDateFilter.DATE_PATTERNS) {
      // Reset regex
      pattern.lastIndex = 0;

      result = result.replace(pattern, (dateStr: string, ...args: any[]) => {
        const parsedDate = this.parseDate(dateStr);

        if (isSmartContext) {
          const smartContext = context as RedactionContext;
          return smartContext.createDateToken(dateStr);
        } else {
          // Fall back to basic date shifting for RedactionContext
          return (context as RedactionContext).createDateToken(dateStr);
        }
      });
    }

    return result;
  }

  getType(): string {
    return "DATE";
  }

  /**
   * Parse date string to Date object
   *
   * Supports multiple formats:
   * - MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
   * - YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
   * - Month DD, YYYY (January 15, 2023)
   */
  private parseDate(dateStr: string): Date | undefined {
    // Try MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    let match = dateStr.match(/^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})$/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      let year = parseInt(match[3]);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      // Validate date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }

    // Try YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
    match = dateStr.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);

      // Validate date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }

    // Try Month DD, YYYY
    match = dateStr.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})$/i
    );
    if (match) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      let year = parseInt(match[3]);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      // Map month name to number
      const monthMap: { [key: string]: number } = {
        january: 1, jan: 1,
        february: 2, feb: 2,
        march: 3, mar: 3,
        april: 4, apr: 4,
        may: 5,
        june: 6, jun: 6,
        july: 7, jul: 7,
        august: 8, aug: 8,
        september: 9, sep: 9, sept: 9,
        october: 10, oct: 10,
        november: 11, nov: 11,
        december: 12, dec: 12,
      };

      const month = monthMap[monthName.toLowerCase()];

      if (month && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }

    return undefined;
  }
}
