/**
 * RadiologyLogger - Lightweight logging utility
 * Standalone version for Vulpes Celare
 */

export class RadiologyLogger {
  private static enabled = false;
  
  static enable() { this.enabled = true; }
  static disable() { this.enabled = false; }
  
  static debug(message: string, ...args: any[]) {
    if (this.enabled) console.debug("[DEBUG]", message, ...args);
  }
  
  static info(message: string, ...args: any[]) {
    if (this.enabled) console.info("[INFO]", message, ...args);
  }
  
  static warn(message: string, ...args: any[]) {
    if (this.enabled) console.warn("[WARN]", message, ...args);
  }
  
  static error(message: string, ...args: any[]) {
    console.error("[ERROR]", message, ...args);
  }
  
  static loading(message: string, ...args: any[]) {
    if (this.enabled) console.log("[LOADING]", message, ...args);
  }
  
  static success(message: string, ...args: any[]) {
    if (this.enabled) console.log("[SUCCESS]", message, ...args);
  }
  
  static redactionDebug(message: string, data?: any) {
    if (this.enabled) console.debug("[REDACTION]", message, data || "");
  }
}
