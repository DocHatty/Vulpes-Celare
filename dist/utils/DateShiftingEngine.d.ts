/**
 * DateShiftingEngine - Date shifting for de-identification
 * Standalone version for Vulpes Celare
 */
export declare class DateShiftingEngine {
    private shiftDays;
    private dateMap;
    private tokenCounter;
    private sessionId;
    constructor(sessionIdOrShiftDays?: string | number);
    shiftDate(date: Date): Date;
    addDate(original: string): number | null;
    generateToken(eventNumber: number | string): string;
    getSummary(): string;
    static generateRandomShift(minDays?: number, maxDays?: number): number;
    setShift(days: number): void;
    getShift(): number;
}
//# sourceMappingURL=DateShiftingEngine.d.ts.map