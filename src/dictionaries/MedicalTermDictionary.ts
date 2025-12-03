/**
 * Medical Term Dictionary
 *
 * @deprecated Use DocumentVocabulary.isMedicalTerm() directly instead.
 * This class now delegates to DocumentVocabulary for all lookups.
 * Maintained for backward compatibility only.
 *
 * Migration:
 *   // Before:
 *   import { MedicalTermDictionary } from "./dictionaries/MedicalTermDictionary";
 *   MedicalTermDictionary.isMedicalTerm(text);
 *
 *   // After:
 *   import { DocumentVocabulary } from "./vocabulary/DocumentVocabulary";
 *   DocumentVocabulary.isMedicalTerm(text);
 */

import { DocumentVocabulary } from "../vocabulary/DocumentVocabulary";

export class MedicalTermDictionary {
  /**
   * Check if a term is a medical term
   * @deprecated Use DocumentVocabulary.isMedicalTerm() directly
   */
  static isMedicalTerm(text: string): boolean {
    return DocumentVocabulary.isMedicalTerm(text);
  }
}
