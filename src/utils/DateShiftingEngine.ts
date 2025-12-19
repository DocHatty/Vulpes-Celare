/**
 * DateShiftingEngine - Date shifting for de-identification
 * Standalone version for Vulpes Celare
 */

export class DateShiftingEngine {
  private shiftDays: number;
  private dateMap: Map<string, number> = new Map();
  private tokenCounter: number = 0;

  constructor(sessionIdOrShiftDays: string | number = 0) {
    if (typeof sessionIdOrShiftDays === "string") {
      this.shiftDays = Math.floor(Math.random() * 365) - 182; // Random shift
    } else {
      this.shiftDays = sessionIdOrShiftDays;
    }
  }

  shiftDate(date: Date): Date {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + this.shiftDays);
    return shifted;
  }

  addDate(original: string): number | null {
    if (this.dateMap.has(original)) {
      return this.dateMap.get(original)!;
    }
    this.tokenCounter++;
    this.dateMap.set(original, this.tokenCounter);
    return this.tokenCounter;
  }

  generateToken(eventNumber: number | string): string {
    if (typeof eventNumber === "number") {
      return "[DATE_" + eventNumber + "]";
    }
    this.tokenCounter++;
    return "[DATE_" + this.tokenCounter + "]";
  }

  getSummary(): string {
    return "Dates processed: " + this.dateMap.size;
  }

  static generateRandomShift(minDays: number = -365, maxDays: number = 365): number {
    return Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  }

  setShift(days: number): void { this.shiftDays = days; }
  getShift(): number { return this.shiftDays; }
}
