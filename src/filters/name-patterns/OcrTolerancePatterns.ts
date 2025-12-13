export type NamePatternDef = {
  regex: RegExp;
  confidence: number;
  note: string;
};

export function getOcrLastFirstPatternDefs(): NamePatternDef[] {
  return [
    // ULTRA-PERMISSIVE: ANY case mix, hyphens, apostrophes, dots, spaces
    // Catches: "aNDREA bUI", "arjun al-fasri", "Ka rer Kim-Pqrk", "vladimir p. wrighf"
    {
      regex:
        /\b([a-zA-Z][a-zA-Z\s.'-]{1,40})\s+([a-zA-Z][a-zA-Z\s.'-]{1,40})\b/g,
      confidence: 0.8,
      note: "ultra-permissive mixed case",
    },

    // Space before comma: "Le , Sanjay"
    {
      regex: /\b([A-Z][a-z]+)\s+,\s+([A-Z][a-z]+)\b/g,
      confidence: 0.88,
      note: "space before comma",
    },

    // Last, First with optional spaces around comma: "Torres , Wilferd"
    {
      regex:
        /\b([A-Za-z][A-Za-z\s.'-]{1,30})\s*,\s*([A-Za-z][A-Za-z\s.'-]{1,30})\b/g,
      confidence: 0.87,
      note: "Last, First with spaces",
    },

    // OCR comma in wrong place: "Wals,h Ali" or "Hajid,R aj"
    {
      regex:
        /\b([A-Z][a-z]{1,10}),([a-z]{1,10})\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?)\b/g,
      confidence: 0.88,
      note: "comma misplaced",
    },

    // OCR digits in names: "J0nse", "ZHAN6", "Wilferd" (f→d)
    {
      regex: /\b([A-Z][a-z0-9]{2,20}),\s*([A-Z][a-z0-9\s]{2,})\b/gi,
      confidence: 0.9,
      note: "digits in name",
    },

    // ALL CAPS with OCR digits: "ZHAN6, SUSAN"
    {
      regex: /\b([A-Z0-9]{2,20}),\s+([A-Z][A-Z\s]+)\b/g,
      confidence: 0.92,
      note: "ALL CAPS with OCR",
    },
  ];
}

export function getChaosLastFirstPatternDefs(): NamePatternDef[] {
  return [
    // Space BEFORE comma: "Smith ,John" or "gOLdbeeRg ,marTinA"
    {
      regex:
        /\b([a-zA-Z0-9@$!][a-zA-Z0-9@$!'.-]{1,20})\s+,\s*([a-zA-Z0-9@$!][a-zA-Z0-9@$!.'`-]{1,30})\b/g,
      confidence: 0.85,
      note: "space before comma",
    },

    // All lowercase Last, First: "martinez, latonya" or "smith, john a."
    {
      regex:
        /\b([a-z][a-z0-9@$!'-]{2,20})\s*,\s*([a-z][a-z0-9@$!.'`-]{2,30})\b/g,
      confidence: 0.82,
      note: "all lowercase",
    },

    // Mixed chaos case with comma: "gOLdbeeRg,marTinA" or "NAKAMURA,kevin"
    {
      regex:
        /\b([a-zA-Z][a-zA-Z0-9@$!'.-]{2,20})\s*,\s*([a-zA-Z][a-zA-Z0-9@$!'`.-]{2,30})\b/g,
      confidence: 0.8,
      note: "mixed case chaos",
    },

    // OCR substitutions in Last, First: "5mith, j0hn" or "Sh@pira, M@ria"
    {
      regex:
        /\b([a-zA-Z0-9@$!][a-zA-Z0-9@$!'-]{2,20})\s*,\s*([a-zA-Z0-9@$!][a-zA-Z0-9@$!'`.-]{2,30})\b/g,
      confidence: 0.83,
      note: "OCR substitutions",
    },
  ];
}
