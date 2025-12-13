//! OcrChaosDetector - Adaptive Document Quality Assessment
//!
//! Measures OCR quality and text corruption to enable adaptive detection thresholds.
//! Documents with higher chaos scores should use more permissive matching patterns.
//!
//! MATHEMATICAL FOUNDATION:
//! 1. Shannon Entropy - Measures character distribution randomness
//!    Formula: H = -sum(p_i * log2(p_i)) where p_i = frequency of character i
//!
//! 2. Weighted Chaos Score - Combines multiple indicators with empirical weights
//!
//! 3. Sigmoid Threshold Mapping - Smooth threshold adjustment

use napi_derive::napi;
use std::collections::HashMap;
use std::sync::Mutex;

const LOG2: f64 = std::f64::consts::LN_2;
const EPSILON: f64 = 1e-10;

#[napi(object)]
#[derive(Clone)]
pub struct ChaosIndicators {
    /// Digit-for-letter substitutions (0→O, 1→l, 5→S)
    pub digit_substitutions: f64,
    /// Case inconsistency (mIxEd CaSe)
    pub case_chaos_factor: f64,
    /// Spacing anomalies (extra spaces, missing spaces)
    pub spacing_anomalies: f64,
    /// Character corruption (partial chars, merged chars)
    pub char_corruption: f64,
}

#[napi(object)]
#[derive(Clone)]
pub struct ChaosAnalysis {
    /// Overall chaos score 0.0 (clean) to 1.0 (total chaos)
    pub score: f64,
    /// Individual chaos indicators
    pub indicators: ChaosIndicators,
    /// Recommended confidence threshold for this document
    pub recommended_threshold: f64,
    /// Whether to enable permissive label-based detection
    pub enable_label_boost: bool,
    /// Human-readable quality assessment: CLEAN, NOISY, DEGRADED, CHAOTIC
    pub quality: String,
}

#[napi(object)]
#[derive(Clone)]
pub struct ConfidenceWeights {
    /// Base confidence for proper case (Patricia Johnson)
    pub proper_case: f64,
    /// Confidence for ALL CAPS (PATRICIA JOHNSON)
    pub all_caps: f64,
    /// Confidence for all lowercase (patricia johnson)
    pub all_lower: f64,
    /// Confidence for mixed chaos (pAtRiCiA jOhNsOn)
    pub chaos_case: f64,
    /// Boost when preceded by explicit label (Patient Name:)
    pub label_boost: f64,
}

/// Cache for analyzed documents
struct AnalysisCache {
    cache: HashMap<String, ChaosAnalysis>,
    order: Vec<String>,
    max_size: usize,
}

impl AnalysisCache {
    fn new(max_size: usize) -> Self {
        Self {
            cache: HashMap::with_capacity(max_size),
            order: Vec::with_capacity(max_size),
            max_size,
        }
    }

    fn get(&self, key: &str) -> Option<ChaosAnalysis> {
        self.cache.get(key).cloned()
    }

    fn insert(&mut self, key: String, value: ChaosAnalysis) {
        if self.cache.len() >= self.max_size && !self.cache.contains_key(&key) {
            // Evict oldest 20 entries
            let to_remove = 20.min(self.order.len());
            for _ in 0..to_remove {
                if let Some(oldest) = self.order.first().cloned() {
                    self.cache.remove(&oldest);
                    self.order.remove(0);
                }
            }
        }
        if !self.cache.contains_key(&key) {
            self.order.push(key.clone());
        }
        self.cache.insert(key, value);
    }

    fn clear(&mut self) {
        self.cache.clear();
        self.order.clear();
    }
}

lazy_static::lazy_static! {
    static ref ANALYSIS_CACHE: Mutex<AnalysisCache> = Mutex::new(AnalysisCache::new(100));
}

/// Sigmoid function for smooth threshold transitions
fn sigmoid(x: f64) -> f64 {
    if x >= 0.0 {
        1.0 / (1.0 + (-x).exp())
    } else {
        let exp_x = x.exp();
        exp_x / (1.0 + exp_x)
    }
}

/// Calculate Shannon entropy of character distribution
/// Returns normalized entropy in [0, 1] where 1 = maximum randomness
fn calculate_character_entropy(text: &str) -> f64 {
    if text.is_empty() {
        return 0.0;
    }

    // Count character frequencies
    let mut char_counts: HashMap<char, usize> = HashMap::new();
    let mut total = 0usize;

    for ch in text.chars() {
        *char_counts.entry(ch).or_insert(0) += 1;
        total += 1;
    }

    // Calculate entropy
    let mut entropy = 0.0;
    let total_f = total as f64;

    for &count in char_counts.values() {
        let p = count as f64 / total_f;
        if p > EPSILON {
            entropy -= p * (p.ln() / LOG2);
        }
    }

    // Normalize by maximum possible entropy (log2 of 96 printable ASCII chars)
    let max_entropy = (96.0_f64).ln() / LOG2;
    (entropy / max_entropy).min(1.0)
}

/// Measure digit-for-letter substitutions
fn measure_digit_substitutions(text: &str) -> f64 {
    let chars: Vec<char> = text.chars().collect();
    let mut substitution_count = 0;

    // Check for digit in middle of alphabetic sequence
    for i in 1..chars.len().saturating_sub(1) {
        let prev = chars[i - 1];
        let curr = chars[i];
        let next = chars[i + 1];

        if prev.is_ascii_alphabetic() && next.is_ascii_alphabetic() {
            // Common OCR substitutions
            if matches!(curr, '0' | '1' | '5' | '8' | '6' | '4' | '3') {
                substitution_count += 1;
            }
        }
    }

    // Normalize by text length
    let normalized = substitution_count as f64 / (text.len() as f64 / 10.0).max(100.0);
    (normalized * 2.0).min(1.0)
}

/// Measure case chaos (inconsistent capitalization within words)
fn measure_case_chaos(text: &str) -> f64 {
    let mut chaos_words = 0;
    let mut total_words = 0;

    // Simple word extraction
    let mut current_word = String::new();

    for ch in text.chars() {
        if ch.is_ascii_alphabetic() {
            current_word.push(ch);
        } else if !current_word.is_empty() {
            if current_word.len() >= 3 {
                total_words += 1;

                let all_upper = current_word.chars().all(|c| c.is_ascii_uppercase());
                let all_lower = current_word.chars().all(|c| c.is_ascii_lowercase());

                // Check for proper case: first char upper, rest lower
                let chars: Vec<char> = current_word.chars().collect();
                let proper_case = chars[0].is_ascii_uppercase()
                    && chars[1..].iter().all(|c| c.is_ascii_lowercase());

                // Check for camelCase
                let camel_case = chars[0].is_ascii_lowercase()
                    && chars.iter().skip(1).any(|c| c.is_ascii_uppercase());

                if !all_upper && !all_lower && !proper_case && !camel_case {
                    chaos_words += 1;
                }
            }
            current_word.clear();
        }
    }

    // Handle last word
    if current_word.len() >= 3 {
        total_words += 1;
        let all_upper = current_word.chars().all(|c| c.is_ascii_uppercase());
        let all_lower = current_word.chars().all(|c| c.is_ascii_lowercase());
        let chars: Vec<char> = current_word.chars().collect();
        let proper_case =
            chars[0].is_ascii_uppercase() && chars[1..].iter().all(|c| c.is_ascii_lowercase());
        let camel_case =
            chars[0].is_ascii_lowercase() && chars.iter().skip(1).any(|c| c.is_ascii_uppercase());

        if !all_upper && !all_lower && !proper_case && !camel_case {
            chaos_words += 1;
        }
    }

    if total_words == 0 {
        return 0.0;
    }

    ((chaos_words as f64 / total_words as f64) * 3.0).min(1.0)
}

/// Measure spacing anomalies
fn measure_spacing_anomalies(text: &str) -> f64 {
    let mut anomalies = 0;
    let chars: Vec<char> = text.chars().collect();

    // Multiple consecutive spaces (3+)
    let mut consecutive_spaces = 0;
    for &ch in &chars {
        if ch.is_whitespace() {
            consecutive_spaces += 1;
            if consecutive_spaces >= 3 {
                anomalies += 1;
                consecutive_spaces = 0;
            }
        } else {
            consecutive_spaces = 0;
        }
    }

    // Space before punctuation
    for i in 1..chars.len() {
        if chars[i - 1].is_whitespace() && matches!(chars[i], '.' | ',' | ';' | ':' | '!' | '?') {
            anomalies += 1;
        }
    }

    // Letter-space-letter in apparent words
    for i in 2..chars.len() {
        if chars[i - 2].is_ascii_alphabetic()
            && chars[i - 1].is_whitespace()
            && chars[i].is_ascii_alphabetic()
        {
            // Check if next char is also alphabetic (broken word)
            if i + 1 < chars.len() && chars[i + 1].is_ascii_alphabetic() {
                anomalies += 1;
            }
        }
    }

    (anomalies as f64 / (text.len() as f64 / 50.0).max(10.0)).min(1.0)
}

/// Measure character corruption indicators
fn measure_char_corruption(text: &str) -> f64 {
    let mut corruption = 0;
    let chars: Vec<char> = text.chars().collect();

    // Look for unusual character sequences
    for i in 1..chars.len() {
        let prev = chars[i - 1];
        let curr = chars[i];

        // Multiple pipes/bangs
        if (prev == '|' || prev == '!') && (curr == '|' || curr == '!') {
            corruption += 1;
        }
        // Multiple parens
        if (prev == '(' || prev == ')') && (curr == '(' || curr == ')') {
            corruption += 1;
        }
        // Multiple braces
        if (prev == '{' || prev == '}') && (curr == '{' || curr == '}') {
            corruption += 1;
        }
        // Multiple special chars
        if matches!(prev, '$' | '@' | '#') && matches!(curr, '$' | '@' | '#') {
            corruption += 1;
        }
    }

    (corruption as f64 / (text.len() as f64 / 100.0).max(5.0)).min(1.0)
}

/// Calculate recommended confidence threshold based on chaos score
fn calculate_threshold(chaos_score: f64) -> f64 {
    let max_threshold = 0.85;
    let min_threshold = 0.55;
    let k = 8.0;
    let midpoint = 0.35;

    let sigmoid_value = sigmoid(k * (chaos_score - midpoint));
    let threshold = max_threshold - (max_threshold - min_threshold) * sigmoid_value;

    (threshold * 100.0).round() / 100.0
}

/// Classify overall document quality
fn classify_quality(score: f64) -> String {
    if score < 0.15 {
        "CLEAN".to_string()
    } else if score < 0.35 {
        "NOISY".to_string()
    } else if score < 0.6 {
        "DEGRADED".to_string()
    } else {
        "CHAOTIC".to_string()
    }
}

/// Analyze a document for OCR chaos indicators
#[napi]
pub fn analyze_chaos(text: String) -> ChaosAnalysis {
    // Check cache first (use first 500 chars as key)
    let cache_key: String = text.chars().take(500).collect();

    {
        let cache = ANALYSIS_CACHE.lock().unwrap();
        if let Some(cached) = cache.get(&cache_key) {
            return cached;
        }
    }

    let indicators = ChaosIndicators {
        digit_substitutions: measure_digit_substitutions(&text),
        case_chaos_factor: measure_case_chaos(&text),
        spacing_anomalies: measure_spacing_anomalies(&text),
        char_corruption: measure_char_corruption(&text),
    };

    let char_entropy = calculate_character_entropy(&text);

    // Weighted combination using empirically-derived weights
    let weights = (0.30, 0.25, 0.20, 0.15, 0.10); // digit, case, spacing, corruption, entropy
    let total_weight = weights.0 + weights.1 + weights.2 + weights.3 + weights.4;

    let score = ((indicators.digit_substitutions * weights.0
        + indicators.case_chaos_factor * weights.1
        + indicators.spacing_anomalies * weights.2
        + indicators.char_corruption * weights.3
        + char_entropy * weights.4)
        / total_weight
        * total_weight)
        .min(1.0);

    let analysis = ChaosAnalysis {
        score,
        indicators,
        recommended_threshold: calculate_threshold(score),
        enable_label_boost: score > 0.3,
        quality: classify_quality(score),
    };

    // Cache the result
    {
        let mut cache = ANALYSIS_CACHE.lock().unwrap();
        cache.insert(cache_key, analysis.clone());
    }

    analysis
}

/// Get confidence weights adjusted for document chaos level
#[napi]
pub fn get_confidence_weights(chaos_score: f64) -> ConfidenceWeights {
    if chaos_score > 0.5 {
        // Chaotic document - be very permissive
        ConfidenceWeights {
            proper_case: 0.90,
            all_caps: 0.88,
            all_lower: 0.85,
            chaos_case: 0.75,
            label_boost: 0.20,
        }
    } else if chaos_score > 0.2 {
        // Noisy document - moderate tolerance
        ConfidenceWeights {
            proper_case: 0.92,
            all_caps: 0.88,
            all_lower: 0.82,
            chaos_case: 0.65,
            label_boost: 0.15,
        }
    } else {
        // Clean document - strict
        ConfidenceWeights {
            proper_case: 0.95,
            all_caps: 0.90,
            all_lower: 0.80,
            chaos_case: 0.50,
            label_boost: 0.10,
        }
    }
}

/// Classify the case pattern of a name
#[napi]
pub fn classify_case_pattern(name: String) -> String {
    let trimmed = name.trim();

    // Check if all caps (allowing spaces, periods, apostrophes, hyphens)
    let has_alpha = trimmed.chars().any(|c| c.is_ascii_alphabetic());
    let all_upper = trimmed
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .all(|c| c.is_ascii_uppercase());
    if has_alpha && all_upper {
        return "ALL_CAPS".to_string();
    }

    // Check if all lowercase
    let all_lower = trimmed
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .all(|c| c.is_ascii_lowercase());
    if has_alpha && all_lower {
        return "ALL_LOWER".to_string();
    }

    // Check if proper case (each word starts with capital, rest lowercase)
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    let is_proper_case = words.iter().all(|word| {
        let cleaned: String = word.chars().filter(|c| c.is_ascii_alphabetic()).collect();
        if cleaned.is_empty() {
            return true;
        }
        if cleaned.len() == 1 {
            return cleaned.chars().next().unwrap().is_ascii_uppercase();
        }
        let chars: Vec<char> = cleaned.chars().collect();
        chars[0].is_ascii_uppercase() && chars[1..].iter().all(|c| c.is_ascii_lowercase())
    });

    if is_proper_case {
        return "PROPER".to_string();
    }

    "CHAOS".to_string()
}

/// Calculate confidence for a specific name match based on its case pattern
#[napi]
pub fn calculate_name_confidence(name: String, chaos_score: f64, has_label: bool) -> f64 {
    let weights = get_confidence_weights(chaos_score);
    let case_pattern = classify_case_pattern(name);

    let mut base_confidence = match case_pattern.as_str() {
        "PROPER" => weights.proper_case,
        "ALL_CAPS" => weights.all_caps,
        "ALL_LOWER" => weights.all_lower,
        _ => weights.chaos_case,
    };

    if has_label {
        base_confidence = (base_confidence + weights.label_boost).min(0.98);
    }

    base_confidence
}

/// Clear the analysis cache
#[napi]
pub fn clear_chaos_cache() {
    let mut cache = ANALYSIS_CACHE.lock().unwrap();
    cache.clear();
}
