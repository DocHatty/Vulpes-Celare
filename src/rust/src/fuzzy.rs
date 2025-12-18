//! FastFuzzyMatcher - SymSpell-Inspired High-Performance Fuzzy Matching
//!
//! PERFORMANCE: 100-1000x faster than traditional approaches
//!
//! ALGORITHM:
//! Based on SymSpell's Symmetric Delete algorithm by Wolf Garbe (2012):
//! - Pre-compute deletion neighborhood for dictionary terms
//! - Store deletions in hash map for O(1) lookup
//! - On query: generate deletions, check hash map, verify candidates
//!
//! Reference: https://github.com/wolfgarbe/SymSpell

use napi_derive::napi;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

/// LRU Cache implementation for query results
struct LruCache<K, V> {
    capacity: usize,
    map: HashMap<K, V>,
    order: Vec<K>,
}

impl<K: std::hash::Hash + Eq + Clone, V: Clone> LruCache<K, V> {
    fn new(capacity: usize) -> Self {
        Self {
            capacity,
            map: HashMap::with_capacity(capacity),
            order: Vec::with_capacity(capacity),
        }
    }

    fn get(&mut self, key: &K) -> Option<V> {
        if let Some(value) = self.map.get(key) {
            // Move to front (most recently used)
            if let Some(pos) = self.order.iter().position(|k| k == key) {
                self.order.remove(pos);
                self.order.push(key.clone());
            }
            Some(value.clone())
        } else {
            None
        }
    }

    fn insert(&mut self, key: K, value: V) {
        if self.map.len() >= self.capacity && !self.map.contains_key(&key) {
            // Evict oldest
            if let Some(oldest) = self.order.first().cloned() {
                self.map.remove(&oldest);
                self.order.remove(0);
            }
        }
        self.map.insert(key.clone(), value);
        if let Some(pos) = self.order.iter().position(|k| k == &key) {
            self.order.remove(pos);
        }
        self.order.push(key);
    }

    fn clear(&mut self) {
        self.map.clear();
        self.order.clear();
    }
}

#[napi(object)]
#[derive(Clone)]
pub struct FuzzyMatchResult {
    pub matched: bool,
    pub term: Option<String>,
    pub distance: i32,
    pub confidence: f64,
    pub match_type: String,
}

#[napi(object)]
#[derive(Clone)]
pub struct FuzzyMatcherConfig {
    pub max_edit_distance: i32,
    pub enable_phonetic: bool,
    pub min_term_length: i32,
    pub cache_size: i32,
}

impl Default for FuzzyMatcherConfig {
    fn default() -> Self {
        Self {
            max_edit_distance: 2,
            enable_phonetic: true,
            min_term_length: 3,
            cache_size: 10000,
        }
    }
}

/// Deletion entry in the index
#[derive(Clone)]
struct DeletionEntry {
    term: String,
    distance: i32,
}

#[napi]
pub struct VulpesFuzzyMatcher {
    config: FuzzyMatcherConfig,
    exact_terms: HashSet<String>,
    deletion_index: HashMap<String, Vec<DeletionEntry>>,
    phonetic_index: HashMap<String, Vec<String>>,
    query_cache: Mutex<LruCache<String, FuzzyMatchResult>>,
}

#[napi]
impl VulpesFuzzyMatcher {
    #[napi(constructor)]
    pub fn new(terms: Vec<String>, config: Option<FuzzyMatcherConfig>) -> Self {
        let config = config.unwrap_or_default();
        let cache_size = config.cache_size.max(100) as usize;

        let mut matcher = Self {
            config,
            exact_terms: HashSet::new(),
            deletion_index: HashMap::new(),
            phonetic_index: HashMap::new(),
            query_cache: Mutex::new(LruCache::new(cache_size)),
        };

        matcher.build_index(terms);
        matcher
    }

    /// Build the deletion index (SymSpell core algorithm)
    fn build_index(&mut self, terms: Vec<String>) {
        for raw_term in terms {
            let term = raw_term.to_lowercase().trim().to_string();
            if (term.len() as i32) < self.config.min_term_length {
                continue;
            }

            // Add to exact match set
            self.exact_terms.insert(term.clone());

            // Generate deletion neighborhood
            let deletions = self.generate_deletions(&term, self.config.max_edit_distance);

            for deletion in deletions {
                self.deletion_index
                    .entry(deletion.text)
                    .or_insert_with(Vec::new)
                    .push(DeletionEntry {
                        term: term.clone(),
                        distance: deletion.distance,
                    });
            }

            // Build phonetic index
            if self.config.enable_phonetic {
                let phonetic = soundex(&term);
                self.phonetic_index
                    .entry(phonetic)
                    .or_insert_with(Vec::new)
                    .push(term.clone());
            }
        }
    }

    /// Generate all deletions of a term up to max_distance
    fn generate_deletions(&self, term: &str, max_distance: i32) -> Vec<DeletionText> {
        let mut result = Vec::new();
        let mut seen = HashSet::new();
        let mut queue = vec![DeletionText {
            text: term.to_string(),
            distance: 0,
        }];

        let min_len = (self.config.min_term_length - max_distance).max(1) as usize;

        while let Some(current) = queue.pop() {
            if current.distance > 0 {
                result.push(current.clone());
            }

            if current.distance >= max_distance {
                continue;
            }

            // Generate deletions by removing each character
            let chars: Vec<char> = current.text.chars().collect();
            for i in 0..chars.len() {
                let deletion: String = chars[..i].iter().chain(chars[i + 1..].iter()).collect();

                if deletion.len() >= min_len && !seen.contains(&deletion) {
                    seen.insert(deletion.clone());
                    queue.push(DeletionText {
                        text: deletion,
                        distance: current.distance + 1,
                    });
                }
            }
        }

        result
    }

    /// Look up a query with fuzzy matching
    #[napi]
    pub fn lookup(&self, query: String) -> FuzzyMatchResult {
        let normalized_query = query.to_lowercase().trim().to_string();

        // Check cache first
        {
            let mut cache = self.query_cache.lock().unwrap();
            if let Some(cached) = cache.get(&normalized_query) {
                return cached;
            }
        }

        // 1. Exact match check (O(1))
        if self.exact_terms.contains(&normalized_query) {
            let result = FuzzyMatchResult {
                matched: true,
                term: Some(normalized_query.clone()),
                distance: 0,
                confidence: 1.0,
                match_type: "EXACT".to_string(),
            };
            self.cache_result(&normalized_query, &result);
            return result;
        }

        // 2. Deletion-based candidate retrieval
        if (normalized_query.len() as i32) >= self.config.min_term_length {
            let candidates = self.get_candidates(&normalized_query);

            if !candidates.is_empty() {
                let mut best_match: Option<(String, i32)> = None;

                for candidate in &candidates {
                    let distance = damerau_levenshtein(&normalized_query, &candidate.term);

                    if distance <= self.config.max_edit_distance {
                        if best_match.is_none() || distance < best_match.as_ref().unwrap().1 {
                            best_match = Some((candidate.term.clone(), distance));
                        }
                    }
                }

                if let Some((term, distance)) = best_match {
                    let confidence = calculate_confidence(&normalized_query, &term, distance);
                    let match_type = if distance == 1 {
                        "DELETE_1"
                    } else {
                        "DELETE_2"
                    };
                    let result = FuzzyMatchResult {
                        matched: true,
                        term: Some(term),
                        distance,
                        confidence,
                        match_type: match_type.to_string(),
                    };
                    self.cache_result(&normalized_query, &result);
                    return result;
                }
            }
        }

        // 3. Phonetic fallback
        if self.config.enable_phonetic
            && (normalized_query.len() as i32) >= self.config.min_term_length
        {
            let phonetic = soundex(&normalized_query);
            if let Some(phonetic_matches) = self.phonetic_index.get(&phonetic) {
                let mut best_match: Option<(String, i32)> = None;

                for term in phonetic_matches {
                    let distance = damerau_levenshtein(&normalized_query, term);
                    if best_match.is_none() || distance < best_match.as_ref().unwrap().1 {
                        best_match = Some((term.clone(), distance));
                    }
                }

                if let Some((term, distance)) = best_match {
                    if distance <= self.config.max_edit_distance + 1 {
                        let confidence =
                            calculate_confidence(&normalized_query, &term, distance) * 0.9;
                        let result = FuzzyMatchResult {
                            matched: true,
                            term: Some(term),
                            distance,
                            confidence,
                            match_type: "PHONETIC".to_string(),
                        };
                        self.cache_result(&normalized_query, &result);
                        return result;
                    }
                }
            }
        }

        // No match found
        let result = FuzzyMatchResult {
            matched: false,
            term: None,
            distance: i32::MAX,
            confidence: 0.0,
            match_type: "NONE".to_string(),
        };
        self.cache_result(&normalized_query, &result);
        result
    }

    /// Get candidates from deletion index
    fn get_candidates(&self, query: &str) -> Vec<DeletionEntry> {
        let mut candidates = Vec::new();
        let mut seen = HashSet::new();

        // Check if query matches any deletion directly
        if let Some(direct_matches) = self.deletion_index.get(query) {
            for entry in direct_matches {
                if !seen.contains(&entry.term) {
                    seen.insert(entry.term.clone());
                    candidates.push(entry.clone());
                }
            }
        }

        // Generate deletions of query and look up
        let query_deletions = self.generate_deletions(query, self.config.max_edit_distance);

        for deletion in query_deletions {
            let del_text = &deletion.text;

            // Check exact match of deletion in dictionary
            if self.exact_terms.contains(del_text) && !seen.contains(del_text) {
                seen.insert(del_text.clone());
                candidates.push(DeletionEntry {
                    term: del_text.clone(),
                    distance: deletion.distance,
                });
            }

            // Check if deletion matches any dictionary term's deletion
            if let Some(matches) = self.deletion_index.get(del_text) {
                for entry in matches {
                    if !seen.contains(&entry.term) {
                        seen.insert(entry.term.clone());
                        candidates.push(entry.clone());
                    }
                }
            }
        }

        candidates
    }

    fn cache_result(&self, query: &str, result: &FuzzyMatchResult) {
        let mut cache = self.query_cache.lock().unwrap();
        cache.insert(query.to_string(), result.clone());
    }

    /// Check if term exists (with fuzzy tolerance)
    #[napi]
    pub fn has(&self, query: String) -> bool {
        self.lookup(query).matched
    }

    /// Get confidence score for a query
    #[napi]
    pub fn get_confidence(&self, query: String) -> f64 {
        self.lookup(query).confidence
    }

    /// Clear the query cache
    #[napi]
    pub fn clear_cache(&self) {
        let mut cache = self.query_cache.lock().unwrap();
        cache.clear();
    }

    /// Get dictionary size
    #[napi]
    pub fn size(&self) -> i32 {
        self.exact_terms.len() as i32
    }

    /// Get deletion index size
    #[napi]
    pub fn index_size(&self) -> i32 {
        self.deletion_index.len() as i32
    }
}

#[derive(Clone)]
struct DeletionText {
    text: String,
    distance: i32,
}

/// Damerau-Levenshtein distance (allows transpositions)
fn damerau_levenshtein(a: &str, b: &str) -> i32 {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let len_a = a_chars.len();
    let len_b = b_chars.len();

    if len_a == 0 {
        return len_b as i32;
    }
    if len_b == 0 {
        return len_a as i32;
    }

    // Early termination for large length differences
    let diff = (len_a as i32 - len_b as i32).abs();
    if diff > 2 {
        return diff;
    }

    // Use 3 rows for Damerau-Levenshtein
    let mut prev_prev = vec![0i32; len_b + 1];
    let mut prev: Vec<i32> = (0..=len_b as i32).collect();
    let mut curr = vec![0i32; len_b + 1];

    for i in 1..=len_a {
        curr[0] = i as i32;

        for j in 1..=len_b {
            let cost = if a_chars[i - 1] == b_chars[j - 1] {
                0
            } else {
                1
            };

            curr[j] = (prev[j] + 1) // deletion
                .min(curr[j - 1] + 1) // insertion
                .min(prev[j - 1] + cost); // substitution

            // Transposition
            if i > 1
                && j > 1
                && a_chars[i - 1] == b_chars[j - 2]
                && a_chars[i - 2] == b_chars[j - 1]
            {
                curr[j] = curr[j].min(prev_prev[j - 2] + cost);
            }
        }

        // Rotate rows
        std::mem::swap(&mut prev_prev, &mut prev);
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[len_b]
}

/// Calculate confidence score based on match quality
fn calculate_confidence(query: &str, matched: &str, distance: i32) -> f64 {
    if distance == 0 {
        return 1.0;
    }

    let max_len = query.len().max(matched.len()) as f64;
    let similarity = 1.0 - (distance as f64 / max_len);

    // Jaro-Winkler bonus for common prefix
    let query_chars: Vec<char> = query.chars().collect();
    let matched_chars: Vec<char> = matched.chars().collect();
    let max_prefix = 4.min(query_chars.len().min(matched_chars.len()));

    let mut prefix_len = 0;
    for i in 0..max_prefix {
        if query_chars[i] == matched_chars[i] {
            prefix_len += 1;
        } else {
            break;
        }
    }

    let prefix_bonus = prefix_len as f64 * 0.1 * (1.0 - similarity);
    let confidence = (similarity + prefix_bonus).min(0.99);

    // Apply distance penalty
    confidence * 0.92_f64.powi(distance)
}

/// Soundex phonetic encoding
fn soundex(text: &str) -> String {
    let s: String = text
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .collect();

    if s.is_empty() {
        return "0000".to_string();
    }

    let chars: Vec<char> = s.chars().collect();
    let mut result = String::with_capacity(4);
    result.push(chars[0]);

    let code = |c: char| -> char {
        match c {
            'B' | 'F' | 'P' | 'V' => '1',
            'C' | 'G' | 'J' | 'K' | 'Q' | 'S' | 'X' | 'Z' => '2',
            'D' | 'T' => '3',
            'L' => '4',
            'M' | 'N' => '5',
            'R' => '6',
            _ => '0',
        }
    };

    let mut prev_code = code(chars[0]);

    for &c in chars.iter().skip(1) {
        if result.len() >= 4 {
            break;
        }
        let curr_code = code(c);
        if curr_code != '0' && curr_code != prev_code {
            result.push(curr_code);
        }
        prev_code = curr_code;
    }

    while result.len() < 4 {
        result.push('0');
    }

    result
}

// Factory functions exposed to JS
#[napi]
pub fn create_first_name_matcher(names: Vec<String>) -> VulpesFuzzyMatcher {
    VulpesFuzzyMatcher::new(
        names,
        Some(FuzzyMatcherConfig {
            max_edit_distance: 2,
            enable_phonetic: true,
            min_term_length: 2,
            cache_size: 5000,
        }),
    )
}

#[napi]
pub fn create_surname_matcher(names: Vec<String>) -> VulpesFuzzyMatcher {
    VulpesFuzzyMatcher::new(
        names,
        Some(FuzzyMatcherConfig {
            max_edit_distance: 2,
            enable_phonetic: true,
            min_term_length: 2,
            cache_size: 5000,
        }),
    )
}

#[napi]
pub fn create_location_matcher(locations: Vec<String>) -> VulpesFuzzyMatcher {
    VulpesFuzzyMatcher::new(
        locations,
        Some(FuzzyMatcherConfig {
            max_edit_distance: 2,
            enable_phonetic: false,
            min_term_length: 3,
            cache_size: 2000,
        }),
    )
}
