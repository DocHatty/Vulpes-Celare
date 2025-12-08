// Lightweight Jaro-Winkler implementation with a tiny LRU cache.
// Keeps SpanDisambiguationService fast while providing meaningful similarity scores.

const CACHE_LIMIT = 500;
const cache = new Map<string, number>();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function cacheKey(a: string, b: string): string {
  // Order-independent key so cache hits for (a,b) and (b,a)
  return a <= b ? `${a}::${b}` : `${b}::${a}`;
}

function remember(key: string, value: number): number {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  return value;
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const len1 = a.length;
  const len2 = b.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array<boolean>(len1).fill(false);
  const matches2 = new Array<boolean>(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (matches2[j]) continue;
      if (a[i] !== b[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 +
      matches / len2 +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler bonus for common prefix up to 4 chars
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, len1, len2); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export function compareTwoStrings(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const key = cacheKey(left, right);
  if (cache.has(key)) return cache.get(key)!;

  return remember(key, jaroWinkler(left, right));
}

export function findBestMatch(s: string, arr: string[]) {
  const ratings = arr.map((target) => ({
    target,
    rating: compareTwoStrings(s, target),
  }));
  const bestMatch =
    ratings.reduce(
      (best, next) => (next.rating > best.rating ? next : best),
      { target: "", rating: -1 },
    ) || ratings[0] || { target: "", rating: 0 };

  return { bestMatch, ratings };
}
