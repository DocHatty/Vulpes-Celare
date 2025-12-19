"use strict";
/**
 * DateShiftingEngine - Date shifting for de-identification
 * Standalone version for Vulpes Celare
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateShiftingEngine = void 0;
class DateShiftingEngine {
    shiftDays;
    dateMap = new Map();
    tokenCounter = 0;
    constructor(sessionIdOrShiftDays = 0) {
        if (typeof sessionIdOrShiftDays === "string") {
            this.shiftDays = Math.floor(Math.random() * 365) - 182; // Random shift
        }
        else {
            this.shiftDays = sessionIdOrShiftDays;
        }
    }
    shiftDate(date) {
        const shifted = new Date(date);
        shifted.setDate(shifted.getDate() + this.shiftDays);
        return shifted;
    }
    addDate(original) {
        if (this.dateMap.has(original)) {
            return this.dateMap.get(original);
        }
        this.tokenCounter++;
        this.dateMap.set(original, this.tokenCounter);
        return this.tokenCounter;
    }
    generateToken(eventNumber) {
        if (typeof eventNumber === "number") {
            return "[DATE_" + eventNumber + "]";
        }
        this.tokenCounter++;
        return "[DATE_" + this.tokenCounter + "]";
    }
    getSummary() {
        return "Dates processed: " + this.dateMap.size;
    }
    static generateRandomShift(minDays = -365, maxDays = 365) {
        return Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
    }
    setShift(days) { this.shiftDays = days; }
    getShift() { return this.shiftDays; }
}
exports.DateShiftingEngine = DateShiftingEngine;
//# sourceMappingURL=DateShiftingEngine.js.map