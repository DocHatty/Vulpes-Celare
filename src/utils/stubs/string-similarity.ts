export function compareTwoStrings(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  return 0.5; // Simplified stub
}
export function findBestMatch(s: string, arr: string[]) {
  return { bestMatch: { target: arr[0] || "", rating: 0.5 }, ratings: [] };
}
