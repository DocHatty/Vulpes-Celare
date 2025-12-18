use napi_derive::napi;
use rphonetic::{DoubleMetaphone, Encoder};
use std::collections::{HashMap, HashSet};

const MAX_LEVENSHTEIN_DISTANCE: usize = 2;
const MIN_NAME_LENGTH: usize = 2;

#[napi(object)]
pub struct PhoneticMatch {
    pub original: String,
    pub matched: String,
    pub confidence: f64,
    pub match_type: String,
}

#[napi(object)]
pub struct PhoneticStats {
    pub first_names: u32,
    pub surnames: u32,
    pub primary_codes: u32,
    pub secondary_codes: u32,
}

#[derive(Default)]
struct PhoneticIndex {
    primary: HashMap<String, Vec<String>>,
    secondary: HashMap<String, Vec<String>>,
    names: HashSet<String>,
    names_by_len: HashMap<usize, Vec<String>>,
}

fn normalize_ocr(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut last_was_space = false;

    for ch in input.chars() {
        let mapped = match ch {
            '0' => 'o',
            '1' | '|' => 'l',
            '!' => 'i',
            '@' => 'a',
            '$' => 's',
            '3' => 'e',
            '4' => 'a',
            '5' => 's',
            '6' => 'g',
            '7' => 't',
            '8' => 'b',
            '9' => 'g',
            _ => ch,
        };

        let lower = mapped.to_ascii_lowercase();
        if lower.is_ascii_whitespace() {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
            continue;
        }
        last_was_space = false;
        out.push(lower);
    }

    out.trim().to_string()
}

fn levenshtein_bounded(a: &[u8], b: &[u8], max: usize) -> usize {
    let (a, b) = if a.len() <= b.len() { (a, b) } else { (b, a) };
    let m = a.len();
    let n = b.len();
    if n.saturating_sub(m) > max {
        return max + 1;
    }

    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr: Vec<usize> = vec![0; n + 1];

    for i in 1..=m {
        curr[0] = i;
        let mut row_min = curr[0];
        let a_ch = a[i - 1];
        for j in 1..=n {
            let cost = if a_ch == b[j - 1] { 0 } else { 1 };
            let v = (prev[j] + 1)
                .min(curr[j - 1] + 1)
                .min(prev[j - 1] + cost);
            curr[j] = v;
            row_min = row_min.min(v);
        }

        if row_min > max {
            return max + 1;
        }

        std::mem::swap(&mut prev, &mut curr);
    }

    prev[n]
}

fn build_index(names: Vec<String>) -> PhoneticIndex {
    let mut index = PhoneticIndex::default();
    let dm = DoubleMetaphone::default();

    for name in names {
        let normalized = name.trim().to_ascii_lowercase();
        if normalized.len() < MIN_NAME_LENGTH {
            continue;
        }
        if !index.names.insert(normalized.clone()) {
            continue;
        }

        index
            .names_by_len
            .entry(normalized.len())
            .or_default()
            .push(normalized.clone());

        let primary = dm.encode(&normalized);
        let secondary = dm.encode_alternate(&normalized);

        if !primary.is_empty() {
            index
                .primary
                .entry(primary.clone())
                .or_default()
                .push(normalized.clone());
        }

        if !secondary.is_empty() && secondary != primary {
            index
                .secondary
                .entry(secondary)
                .or_default()
                .push(normalized.clone());
        }
    }

    index
}

fn find_closest_match(input: &str, candidates: &[String]) -> Option<String> {
    if candidates.is_empty() {
        return None;
    }

    let input_b = input.as_bytes();
    let mut best: Option<&String> = None;
    let mut best_dist = MAX_LEVENSHTEIN_DISTANCE + 1;

    for cand in candidates {
        let d = levenshtein_bounded(input_b, cand.as_bytes(), MAX_LEVENSHTEIN_DISTANCE);
        if d < best_dist {
            best_dist = d;
            best = Some(cand);
            if d <= 1 {
                break;
            }
        }
    }

    if best_dist <= MAX_LEVENSHTEIN_DISTANCE {
        best.cloned()
    } else {
        None
    }
}

fn find_levenshtein_match(input: &str, index: &PhoneticIndex) -> Option<String> {
    let len = input.len();
    if len < MIN_NAME_LENGTH {
        return None;
    }

    let min_len = MIN_NAME_LENGTH.max(len.saturating_sub(2));
    let max_len = len + 2;

    let mut best_match: Option<&String> = None;
    let mut best_dist = MAX_LEVENSHTEIN_DISTANCE + 1;
    let input_b = input.as_bytes();

    for l in min_len..=max_len {
        if let Some(candidates) = index.names_by_len.get(&l) {
            for cand in candidates {
                let d = levenshtein_bounded(input_b, cand.as_bytes(), MAX_LEVENSHTEIN_DISTANCE);
                if d < best_dist {
                    best_dist = d;
                    best_match = Some(cand);
                    if d <= 1 {
                        break;
                    }
                }
            }
        }
        if best_dist <= 1 {
            break;
        }
    }

    if best_dist <= MAX_LEVENSHTEIN_DISTANCE {
        best_match.cloned()
    } else {
        None
    }
}

fn match_against_index(input: &str, index: &PhoneticIndex) -> Option<PhoneticMatch> {
    let normalized = normalize_ocr(input);
    if normalized.len() < MIN_NAME_LENGTH {
        return None;
    }

    if index.names.contains(&normalized) {
        return Some(PhoneticMatch {
            original: input.to_string(),
            matched: normalized,
            confidence: 1.0,
            match_type: "exact".to_string(),
        });
    }

    let dm = DoubleMetaphone::default();
    let primary = dm.encode(&normalized);
    let secondary = dm.encode_alternate(&normalized);

    if !primary.is_empty() {
        if let Some(candidates) = index.primary.get(&primary) {
            if let Some(best) = find_closest_match(&normalized, candidates) {
                return Some(PhoneticMatch {
                    original: input.to_string(),
                    matched: best,
                    confidence: 0.9,
                    match_type: "phonetic_primary".to_string(),
                });
            }
        }
    }

    if !secondary.is_empty() {
        if let Some(candidates) = index.secondary.get(&secondary) {
            if let Some(best) = find_closest_match(&normalized, candidates) {
                return Some(PhoneticMatch {
                    original: input.to_string(),
                    matched: best,
                    confidence: 0.85,
                    match_type: "phonetic_secondary".to_string(),
                });
            }
        }
    }

    if normalized.len() <= 6 {
        if let Some(best) = find_levenshtein_match(&normalized, index) {
            return Some(PhoneticMatch {
                original: input.to_string(),
                matched: best,
                confidence: 0.75,
                match_type: "levenshtein".to_string(),
            });
        }
    }

    None
}

#[napi]
pub struct VulpesPhoneticMatcher {
    first: PhoneticIndex,
    surname: PhoneticIndex,
    initialized: bool,
}

#[napi]
impl VulpesPhoneticMatcher {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            first: PhoneticIndex::default(),
            surname: PhoneticIndex::default(),
            initialized: false,
        }
    }

    #[napi]
    pub fn initialize(&mut self, first_names: Vec<String>, surnames: Vec<String>) {
        self.first = build_index(first_names);
        self.surname = build_index(surnames);
        self.initialized = true;
    }

    #[napi]
    pub fn match_first_name(&self, input: String) -> Option<PhoneticMatch> {
        if !self.initialized {
            return None;
        }
        match_against_index(&input, &self.first)
    }

    #[napi]
    pub fn match_surname(&self, input: String) -> Option<PhoneticMatch> {
        if !self.initialized {
            return None;
        }
        match_against_index(&input, &self.surname)
    }

    #[napi]
    pub fn match_any_name(&self, input: String) -> Option<PhoneticMatch> {
        if !self.initialized {
            return None;
        }
        let first = self.match_first_name(input.clone());
        let surname = self.match_surname(input.clone());
        match (first, surname) {
            (None, None) => None,
            (Some(m), None) => Some(m),
            (None, Some(m)) => Some(m),
            (Some(a), Some(b)) => {
                if a.confidence >= b.confidence {
                    Some(a)
                } else {
                    Some(b)
                }
            }
        }
    }

    #[napi]
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    #[napi]
    pub fn get_stats(&self) -> PhoneticStats {
        PhoneticStats {
            first_names: self.first.names.len() as u32,
            surnames: self.surname.names.len() as u32,
            primary_codes: (self.first.primary.len() + self.surname.primary.len()) as u32,
            secondary_codes: (self.first.secondary.len() + self.surname.secondary.len()) as u32,
        }
    }
}
