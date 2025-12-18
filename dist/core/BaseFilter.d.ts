import { RedactionContext } from "../context/RedactionContext";
/**
 * Legacy BaseFilter - abstract class for text-transform filters.
 *
 * Kept for backward compatibility and to support FilterAdapter while the codebase
 * migrates fully to SpanBasedFilter.
 */
export declare abstract class BaseFilter {
    abstract apply(text: string, config: any, context: RedactionContext): string | Promise<string>;
    abstract getType(): string;
}
//# sourceMappingURL=BaseFilter.d.ts.map