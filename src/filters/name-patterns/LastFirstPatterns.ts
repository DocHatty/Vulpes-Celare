export function getStrictLastFirstPattern(): RegExp {
  // STRICT pattern: "Last, First" format with proper capitalization.
  // Each word must start with a capital letter followed by at least 2 lowercase letters.
  return /\b([A-Z][a-z]{2,},[ \t]+[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
}
