/**
 * IPAddressFilterSpan - IP Address Detection (Span-Based)
 *
 * Detects IPv4 addresses with validation and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class IPAddressFilterSpan extends SpanBasedFilter {
  /**
   * Pre-compiled IPv4 regex pattern
   *
   * Matches: XXX.XXX.XXX.XXX where XXX is 1-3 digits
   * Validation ensures each octet is 0-255
   */
  private static readonly IP_PATTERN =
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

  getType(): string {
    return "IP";
  }

  getPriority(): number {
    return FilterPriority.URL; // Same priority as URLs
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];
    const pattern = IPAddressFilterSpan.IP_PATTERN;
    pattern.lastIndex = 0; // Reset regex

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ip = match[0];

      // Validate IPv4 address octets
      if (this.isValidIP(ip)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.IP,
          0.95 // High confidence for valid IPs
        );
        spans.push(span);
      }
    }

    return spans;
  }

  /**
   * Validate IPv4 address octets
   *
   * Each octet must be 0-255 (inclusive).
   */
  private isValidIP(ip: string): boolean {
    const octets = ip.split(".");

    if (octets.length !== 4) {
      return false;
    }

    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
}
