/**
 * Context Window Service - Extracts and analyzes surrounding text context
 *
 * Provides context windows (±N tokens) around matches for:
 * - Confidence scoring
 * - Disambiguation
 * - Context-aware detection
 *
 * Based on Phileas's window analysis with VulpesHIPPA enhancements.
 *
 * @module redaction/services
 */

export interface ContextWindow {
    before: string[]; // Tokens before the match
    after: string[]; // Tokens after the match
    full: string[]; // All tokens (before + match + after)
    text: string; // Full window as text
}

/**
 * Context Window Service
 */
export class ContextWindowService {
    private windowSize: number;

    constructor(windowSize: number = 5) {
        this.windowSize = windowSize;
    }

    /**
     * Extract context window around a match position
     *
     * @param text - Full text
     * @param matchStart - Start position of match
     * @param matchEnd - End position of match
     * @param windowSize - Override default window size
     */
    getWindow(
        text: string,
        matchStart: number,
        matchEnd: number,
        windowSize?: number
    ): ContextWindow {
        const size = windowSize ?? this.windowSize;

        // Extract text before and after match
        const beforeText = text.substring(0, matchStart);
        const afterText = text.substring(matchEnd);
        const matchText = text.substring(matchStart, matchEnd);

        // Tokenize (split on whitespace and punctuation)
        const beforeTokens = this.tokenize(beforeText);
        const afterTokens = this.tokenize(afterText);

        // Get last N tokens before and first N tokens after
        const before = beforeTokens.slice(-size);
        const after = afterTokens.slice(0, size);

        // Combine
        const full = [...before, matchText, ...after];
        const windowText = full.join(" ");

        return {
            before,
            after,
            full,
            text: windowText
        };
    }

    /**
     * Tokenize text into words
     * Preserves meaningful punctuation but removes noise
     */
    private tokenize(text: string): string[] {
        // Split on whitespace and certain punctuation
        const tokens = text
            .split(/\s+/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Clean up tokens (remove trailing/leading punctuation)
        return tokens.map(token => {
            // Keep internal punctuation (e.g., "don't", "1.5")
            // Remove leading/trailing punctuation
            return token.replace(/^[^\w]+|[^\w]+$/g, "");
        }).filter(t => t.length > 0);
    }

    /**
     * Check if window contains any of the given keywords
     * Case-insensitive by default
     */
    containsKeywords(
        window: ContextWindow,
        keywords: string[],
        caseSensitive: boolean = false
    ): boolean {
        const windowText = caseSensitive
            ? window.text
            : window.text.toLowerCase();

        const searchKeywords = caseSensitive
            ? keywords
            : keywords.map(k => k.toLowerCase());

        return searchKeywords.some(keyword => windowText.includes(keyword));
    }

    /**
     * Count keyword occurrences in window
     */
    countKeywords(
        window: ContextWindow,
        keywords: string[],
        caseSensitive: boolean = false
    ): number {
        const windowText = caseSensitive
            ? window.text
            : window.text.toLowerCase();

        const searchKeywords = caseSensitive
            ? keywords
            : keywords.map(k => k.toLowerCase());

        let count = 0;
        for (const keyword of searchKeywords) {
            // Count occurrences
            const regex = new RegExp(keyword, caseSensitive ? "g" : "gi");
            const matches = windowText.match(regex);
            count += matches ? matches.length : 0;
        }

        return count;
    }

    /**
     * Calculate keyword density (keyword count / total tokens)
     */
    keywordDensity(
        window: ContextWindow,
        keywords: string[],
        caseSensitive: boolean = false
    ): number {
        const keywordCount = this.countKeywords(window, keywords, caseSensitive);
        const totalTokens = window.full.length;

        return totalTokens > 0 ? keywordCount / totalTokens : 0;
    }

    /**
     * Get proximity score: how close is the nearest keyword?
     * Returns 0.0 to 1.0 (1.0 = keyword is adjacent)
     */
    getProximityScore(
        window: ContextWindow,
        keywords: string[],
        caseSensitive: boolean = false
    ): number {
        const searchTokens = caseSensitive
            ? window.full
            : window.full.map(t => t.toLowerCase());

        const searchKeywords = caseSensitive
            ? keywords
            : keywords.map(k => k.toLowerCase());

        // Find closest keyword to the center (match position)
        const center = window.before.length;
        let minDistance = Infinity;

        for (let i = 0; i < searchTokens.length; i++) {
            const token = searchTokens[i];

            for (const keyword of searchKeywords) {
                if (token.includes(keyword)) {
                    const distance = Math.abs(i - center);
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }

        if (minDistance === Infinity) {
            return 0.0; // No keywords found
        }

        // Convert distance to score (closer = higher score)
        const maxDistance = this.windowSize;
        return Math.max(0, 1.0 - (minDistance / maxDistance));
    }

    /**
     * Extract window as character positions (for Span creation)
     */
    getWindowCharacterRange(
        text: string,
        matchStart: number,
        matchEnd: number,
        windowSize?: number
    ): {start: number, end: number} {
        const size = windowSize ?? this.windowSize;

        // Find start of window (N tokens before)
        let windowStart = matchStart;
        let tokenCount = 0;

        for (let i = matchStart - 1; i >= 0 && tokenCount < size; i--) {
            if (/\s/.test(text[i])) {
                tokenCount++;
            }
            windowStart = i;
        }

        // Find end of window (N tokens after)
        let windowEnd = matchEnd;
        tokenCount = 0;

        for (let i = matchEnd; i < text.length && tokenCount < size; i++) {
            if (/\s/.test(text[i])) {
                tokenCount++;
            }
            windowEnd = i;
        }

        return {
            start: Math.max(0, windowStart),
            end: Math.min(text.length, windowEnd)
        };
    }

    /**
     * Check if context indicates a birth date
     */
    isBirthDateContext(window: ContextWindow): boolean {
        const keywords = [
            "dob", "birth", "birthday", "born", "date of birth"
        ];
        return this.containsKeywords(window, keywords);
    }

    /**
     * Check if context indicates a death date
     */
    isDeathDateContext(window: ContextWindow): boolean {
        const keywords = [
            "dod", "death", "died", "deceased", "passed away", "date of death"
        ];
        return this.containsKeywords(window, keywords);
    }

    /**
     * Check if context indicates SSN
     */
    isSSNContext(window: ContextWindow): boolean {
        const keywords = [
            "ssn", "social security", "tax id", "tin", "taxpayer"
        ];
        return this.containsKeywords(window, keywords);
    }

    /**
     * Check if context indicates phone number
     */
    isPhoneContext(window: ContextWindow): boolean {
        const keywords = [
            "phone", "call", "telephone", "mobile", "cell", "contact", "dial"
        ];
        return this.containsKeywords(window, keywords);
    }

    /**
     * Check if context indicates medical record number
     */
    isMRNContext(window: ContextWindow): boolean {
        const keywords = [
            "mrn", "medical record", "patient number", "chart number"
        ];
        return this.containsKeywords(window, keywords);
    }

    /**
     * Get window size
     */
    getWindowSize(): number {
        return this.windowSize;
    }

    /**
     * Set window size
     */
    setWindowSize(size: number): void {
        this.windowSize = size;
    }
}
