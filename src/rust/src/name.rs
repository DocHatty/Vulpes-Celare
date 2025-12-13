use napi_derive::napi;
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::{HashMap, HashSet};

#[napi(object)]
pub struct NameDetection {
    pub character_start: u32,
    pub character_end: u32,
    pub text: String,
    pub confidence: f64,
    pub pattern: String,
}

#[napi(object)]
pub struct NameScannerStats {
    pub first_names: u32,
    pub surnames: u32,
}

pub(crate) static REGEX_LAST_FIRST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Za-z][A-Za-z'`.-]{1,20})\s*,\s*([A-Za-z][A-Za-z'`.-]{1,30})(?:\s+[A-Za-z][A-Za-z'`.-]{1,30})?\b")
        .expect("invalid REGEX_LAST_FIRST")
});

pub(crate) static REGEX_LOWER_LAST_FIRST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([a-z][a-z'`.-]{2,20})\s*,\s*([a-z][a-z'`.-]{2,30})(?:\s+[a-z][a-z'`.-]{2,30})?\b")
        .expect("invalid REGEX_LOWER_LAST_FIRST")
});

pub(crate) static REGEX_CHAOS_LAST_FIRST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([a-zA-Z0-9@$!][a-zA-Z0-9@$!'.-]{1,20})\s*,\s*([a-zA-Z0-9@$!][a-zA-Z0-9@$!.'`-]{1,30})\b")
        .expect("invalid REGEX_CHAOS_LAST_FIRST")
});

pub(crate) static REGEX_FIRST_LAST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"\b([A-Z][A-Za-z'`.-]{1,30})(?:\s+[A-Z]\.)?\s+([A-Z][A-Za-z'`.-]{1,30})\b",
    )
    .expect("invalid REGEX_FIRST_LAST")
});

// =============================================================================
// SMART NAME PATTERNS (ports SmartNameFilterSpan pattern families)
// =============================================================================

static REGEX_TITLED_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Dr|Mr|Mrs|Ms|Miss|Prof|Rev|Hon|Capt|Lt|Sgt|Col|Gen)\.?\s+([A-Z][A-Za-z'`.-]{1,30}(?:\s+[A-Z][A-Za-z'`.-]{1,30}){0,2})\b")
        .expect("invalid REGEX_TITLED_NAME")
});

static REGEX_PATIENT_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Patient|Pt|Subject|Individual|Client)\s*[:\t ]+\s*([A-Z][a-z]{2,}(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][a-z]{2,}){1,2})\b")
        .expect("invalid REGEX_PATIENT_NAME")
});

static REGEX_PATIENT_ALLCAPS_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Patient|Pt|Subject|Individual|Client)\s*[:]\s*([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b")
        .expect("invalid REGEX_PATIENT_ALLCAPS_NAME")
});

static REGEX_STANDALONE_ALLCAPS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b").expect("invalid REGEX_STANDALONE_ALLCAPS")
});

static REGEX_FAMILY_MEMBER_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:mother|father|mom|dad|sister|brother|spouse|wife|husband|son|daughter)\s*[:\t -]*([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b")
        .expect("invalid REGEX_FAMILY_MEMBER_NAME")
});

static REGEX_NAME_WITH_SUFFIX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Z][A-Za-z'`.-]{1,30}(?:\s+[A-Z][A-Za-z'`.-]{1,30}){1,2})(?:,\s*)?(?:Jr|Sr|II|III|IV)\.?\b")
        .expect("invalid REGEX_NAME_WITH_SUFFIX")
});

static REGEX_AGE_GENDER_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:\d{1,3}\s*(?:yo|y/o|year[- ]old|yr[- ]old)|male|female|man|woman|boy|girl)\s+(?:named\s+)?([A-Z][a-z]{2,}(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]{2,}){1,2})\b")
        .expect("invalid REGEX_AGE_GENDER_NAME")
});

static REGEX_POSSESSIVE_NAME: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b([A-Z][a-z]{2,})'s\b").expect("invalid REGEX_POSSESSIVE_NAME"));

static REGEX_LABELED_CHAOS_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Patient|Pt|Name|Preferred\s+Name)\s*[:#]\s*([A-Za-z0-9@$!][A-Za-z0-9@$!'.-]{2,}(?:\s+[A-Za-z0-9@$!][A-Za-z0-9@$!'.-]{2,}){1,2})\b")
        .expect("invalid REGEX_LABELED_CHAOS_NAME")
});

static REGEX_HYPHENATED_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Z][a-z]{1,}(?:-[A-Z][a-z]{1,})+(?:\s+[A-Z][a-z]{2,})?)\b")
        .expect("invalid REGEX_HYPHENATED_NAME")
});

static REGEX_APOSTROPHE_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Z][A-Za-z]{1,}'[A-Za-z]{1,}(?:\s+[A-Z][A-Za-z'`.-]{1,30})?)\b")
        .expect("invalid REGEX_APOSTROPHE_NAME")
});

static REGEX_ACCENTED_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?u)\b(\p{Lu}\p{L}{1,30}(?:\s+\p{Lu}\p{L}{1,30}){1,2})\b")
        .expect("invalid REGEX_ACCENTED_NAME")
});

static REGEX_PARTICLE_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Z][a-z]+\s+(?:van|de|von|di|da|du|del|della|la|le|el|al|bin|ibn|af|av|ten|ter|vander|vanden)\s+[A-Z][a-z]+)\b")
        .expect("invalid REGEX_PARTICLE_NAME")
});

static REGEX_TEAM_MEMBER_LINE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?m)^\s*[-*]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b")
        .expect("invalid REGEX_TEAM_MEMBER_LINE")
});

static REGEX_CONCATENATED_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b([A-Z][a-z]{2,})([A-Z][a-z]{2,})\b").expect("invalid REGEX_CONCATENATED_NAME")
});

fn is_excluded_allcaps_acronym(s: &str) -> bool {
    let excluded = [
        "CT", "MRI", "PET", "EKG", "ECG", "CBC", "USA", "FBI", "CIA", "ER", "IV",
    ];
    excluded.contains(&s)
}

pub(crate) fn normalize_ocr_chars(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        let mapped = match ch {
            '0' => 'o',
            '1' | '|' => 'l',
            '!' => 'i',
            '5' => 's',
            '@' => 'a',
            '$' => 's',
            '8' => 'b',
            '6' => 'g',
            '9' => 'g',
            '3' => 'e',
            '4' => 'a',
            '7' => 't',
            '2' => 'z',
            _ => ch,
        };
        out.push(mapped);
    }
    out
}

pub(crate) fn first_token_lower(s: &str) -> String {
    let mut out = String::new();
    for ch in s.chars() {
        if ch.is_whitespace() || ch == '.' {
            break;
        }
        out.push(ch.to_ascii_lowercase());
    }
    out.trim().to_string()
}

pub(crate) fn normalize_for_dict(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        let mapped = match ch {
            '@' => 'a',
            '0' => 'o',
            '1' => 'l',
            '3' => 'e',
            '$' => 's',
            '8' => 'b',
            '9' => 'g',
            '5' => 's',
            '|' => 'l',
            'I' => 'l',
            'c' => 'e',
            _ => ch,
        };
        out.push(mapped.to_ascii_lowercase());
    }
    out
}

pub(crate) fn deduplicate(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut prev: Option<char> = None;
    for ch in input.chars() {
        if Some(ch) == prev {
            continue;
        }
        out.push(ch);
        prev = Some(ch);
    }
    out
}

pub(crate) fn in_dict_with_ocr(set: &HashSet<String>, word: &str) -> bool {
    let lower = word.trim().to_ascii_lowercase();
    if lower.is_empty() {
        return false;
    }
    if set.contains(&lower) {
        return true;
    }

    let normalized = normalize_for_dict(&lower);
    if normalized != lower && set.contains(&normalized) {
        return true;
    }

    let deduped = deduplicate(&normalized);
    deduped != normalized && set.contains(&deduped)
}

pub(crate) fn is_valid_part(normalized: &str) -> bool {
    let lower = normalized.to_ascii_lowercase();
    if lower.len() < 2 || lower.len() > 20 {
        return false;
    }
    lower.chars().any(|c| c.is_ascii_lowercase())
}

pub(crate) fn build_utf16_index_map(text: &str) -> Vec<(usize, u32)> {
    let mut map: Vec<(usize, u32)> = Vec::with_capacity(text.len().min(1024));
    let mut u16_pos: u32 = 0;
    map.push((0, 0));
    for (byte_pos, ch) in text.char_indices() {
        map.push((byte_pos, u16_pos));
        u16_pos = u16_pos.saturating_add(ch.len_utf16() as u32);
    }
    map.push((text.len(), u16_pos));
    map.sort_by_key(|(b, _)| *b);
    map.dedup_by_key(|(b, _)| *b);
    map
}

pub(crate) fn byte_to_utf16(map: &[(usize, u32)], byte_pos: usize) -> u32 {
    match map.binary_search_by_key(&byte_pos, |(b, _)| *b) {
        Ok(i) => map[i].1,
        Err(i) => {
            // Should not happen (regex matches align to char boundaries), but be safe.
            if i == 0 {
                0
            } else {
                map[i - 1].1
            }
        }
    }
}

#[napi]
pub struct VulpesNameScanner {
    first_names: HashSet<String>,
    surnames: HashSet<String>,
    initialized: bool,
}

#[napi]
impl VulpesNameScanner {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            first_names: HashSet::new(),
            surnames: HashSet::new(),
            initialized: false,
        }
    }

    #[napi]
    pub fn initialize(&mut self, first_names: Vec<String>, surnames: Vec<String>) {
        self.first_names = first_names
            .into_iter()
            .map(|s| s.trim().to_ascii_lowercase())
            .filter(|s| !s.is_empty())
            .collect();
        self.surnames = surnames
            .into_iter()
            .map(|s| s.trim().to_ascii_lowercase())
            .filter(|s| !s.is_empty())
            .collect();
        self.initialized = true;
    }

    #[napi]
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    #[napi]
    pub fn get_stats(&self) -> NameScannerStats {
        NameScannerStats {
            first_names: self.first_names.len() as u32,
            surnames: self.surnames.len() as u32,
        }
    }

    /// Detect Last, First-style patient names.
    ///
    /// This targets the highest-frequency "medical record" pattern and is intended
    /// to replace the hottest regex inner loop in TS filters, under a feature flag.
    #[napi]
    pub fn detect_last_first(&self, text: String) -> Vec<NameDetection> {
        if !self.initialized || text.is_empty() {
            return vec![];
        }

        let map = build_utf16_index_map(&text);
        let mut out: Vec<NameDetection> = Vec::new();

        let mut scan = |re: &Regex, base_conf: f64, pattern: &str| {
            for caps in re.captures_iter(&text) {
                let m = match caps.get(0) {
                    Some(v) => v,
                    None => continue,
                };
                let last = caps.get(1).map(|v| v.as_str()).unwrap_or("");
                let first = caps.get(2).map(|v| v.as_str()).unwrap_or("");

                let normalized_last = normalize_ocr_chars(last).to_ascii_lowercase();
                let normalized_first = first_token_lower(&normalize_ocr_chars(first));

                if !is_valid_part(&normalized_last) || !is_valid_part(&normalized_first) {
                    continue;
                }

                let last_in = self.surnames.contains(&normalized_last);
                let first_in = self.first_names.contains(&normalized_first);

                // Anchor on dictionary membership to keep false positives low.
                if !(last_in || first_in) {
                    continue;
                }

                let mut confidence = base_conf;
                if last_in && first_in {
                    confidence = (confidence + 0.1).min(0.95);
                } else {
                    confidence = (confidence + 0.05).min(0.92);
                }

                let start_u16 = byte_to_utf16(&map, m.start());
                let end_u16 = byte_to_utf16(&map, m.end());

                out.push(NameDetection {
                    character_start: start_u16,
                    character_end: end_u16,
                    text: m.as_str().to_string(),
                    confidence,
                    pattern: pattern.to_string(),
                });
            }
        };

        scan(&REGEX_LAST_FIRST, 0.88, "Rust Last, First");
        scan(&REGEX_LOWER_LAST_FIRST, 0.82, "Rust Lowercase Last, First");
        scan(&REGEX_CHAOS_LAST_FIRST, 0.83, "Rust Chaos Last, First");

        // Deduplicate by span range, keeping the highest-confidence detection.
        let mut best: HashMap<u64, NameDetection> = HashMap::new();
        for d in out {
            let key = ((d.character_start as u64) << 32) | (d.character_end as u64);
            match best.get(&key) {
                None => {
                    best.insert(key, d);
                }
                Some(existing) => {
                    if d.confidence > existing.confidence {
                        best.insert(key, d);
                    }
                }
            }
        }

        let mut deduped: Vec<NameDetection> = best.into_values().collect();
        deduped.sort_by(|a, b| a.character_start.cmp(&b.character_start));
        deduped
    }

    /// Detect First Last-style names (no comma).
    ///
    /// This is intentionally conservative (capitalized words + dictionary anchors).
    /// Use shadow mode in TS before promoting to default behavior.
    #[napi]
    pub fn detect_first_last(&self, text: String) -> Vec<NameDetection> {
        if !self.initialized || text.is_empty() {
            return vec![];
        }

        let map = build_utf16_index_map(&text);
        let mut out: Vec<NameDetection> = Vec::new();

        for caps in REGEX_FIRST_LAST.captures_iter(&text) {
            let m = match caps.get(0) {
                Some(v) => v,
                None => continue,
            };

            let first = caps.get(1).map(|v| v.as_str()).unwrap_or("");
            let last = caps.get(2).map(|v| v.as_str()).unwrap_or("");

            if first.is_empty() || last.is_empty() {
                continue;
            }

            let first_is_first = in_dict_with_ocr(&self.first_names, first);
            let first_is_last = in_dict_with_ocr(&self.surnames, first);
            let last_is_last = in_dict_with_ocr(&self.surnames, last);
            let last_is_first = in_dict_with_ocr(&self.first_names, last);

            // Anchor: at least one side should look like a name in either dictionary.
            if !(first_is_first || first_is_last || last_is_last || last_is_first) {
                continue;
            }

            // Confidence model mirrors NameDictionary.getNameConfidence() semantics.
            let confidence = if first_is_first && last_is_last {
                0.92
            } else if first_is_first && !last_is_last {
                0.84
            } else if !first_is_first && last_is_last {
                if first_is_last {
                    0.78
                } else {
                    0.7
                }
            } else {
                0.68
            };

            let start_u16 = byte_to_utf16(&map, m.start());
            let end_u16 = byte_to_utf16(&map, m.end());

            out.push(NameDetection {
                character_start: start_u16,
                character_end: end_u16,
                text: m.as_str().to_string(),
                confidence,
                pattern: "Rust First Last".to_string(),
            });
        }

        // Deduplicate by span range, keeping highest confidence.
        let mut best: HashMap<u64, NameDetection> = HashMap::new();
        for d in out {
            let key = ((d.character_start as u64) << 32) | (d.character_end as u64);
            match best.get(&key) {
                None => {
                    best.insert(key, d);
                }
                Some(existing) => {
                    if d.confidence > existing.confidence {
                        best.insert(key, d);
                    }
                }
            }
        }

        let mut deduped: Vec<NameDetection> = best.into_values().collect();
        deduped.sort_by(|a, b| a.character_start.cmp(&b.character_start));
        deduped
    }

    /// Detect "smart" patient name patterns beyond the comma family.
    ///
    /// This ports the expensive SmartNameFilterSpan regex passes into Rust.
    /// Roll out via shadow mode first, then promote behind `VULPES_NAME_ACCEL=3`.
    #[napi]
    pub fn detect_smart(&self, text: String) -> Vec<NameDetection> {
        if !self.initialized || text.is_empty() {
            return vec![];
        }

        let map = build_utf16_index_map(&text);
        let mut out: Vec<NameDetection> = Vec::new();

        let has_any_name_anchor = |s: &str| -> bool {
            for p in s.split_whitespace() {
                if in_dict_with_ocr(&self.first_names, p) || in_dict_with_ocr(&self.surnames, p) {
                    return true;
                }
            }
            false
        };

        let patterns: Vec<(&Regex, usize, f64, &'static str)> = vec![
            (&REGEX_TITLED_NAME, 1, 0.92, "Rust Titled name"),
            (&REGEX_PATIENT_NAME, 1, 0.92, "Rust Patient name"),
            (&REGEX_PATIENT_ALLCAPS_NAME, 1, 0.9, "Rust Patient all caps"),
            (&REGEX_FAMILY_MEMBER_NAME, 1, 0.9, "Rust Family member"),
            (&REGEX_NAME_WITH_SUFFIX, 1, 0.9, "Rust Name with suffix"),
            (&REGEX_AGE_GENDER_NAME, 1, 0.9, "Rust Age/gender name"),
            (&REGEX_POSSESSIVE_NAME, 1, 0.78, "Rust Possessive name"),
            (&REGEX_LABELED_CHAOS_NAME, 1, 0.88, "Rust Labeled name (OCR/chaos)"),
            (&REGEX_HYPHENATED_NAME, 1, 0.86, "Rust Hyphenated name"),
            (&REGEX_APOSTROPHE_NAME, 1, 0.86, "Rust Apostrophe name"),
            (&REGEX_ACCENTED_NAME, 1, 0.84, "Rust Accented name"),
            (&REGEX_PARTICLE_NAME, 1, 0.86, "Rust Particle name"),
            (&REGEX_TEAM_MEMBER_LINE, 1, 0.85, "Rust Team member list"),
        ];

        for (re, group, base_conf, label) in patterns.iter() {
            for caps in re.captures_iter(&text) {
                let m = match caps.get(*group) {
                    Some(v) => v,
                    None => continue,
                };
                let candidate = m.as_str();
                if candidate.contains(',') {
                    continue;
                }
                if candidate.len() < 3 {
                    continue;
                }

                let mut confidence = *base_conf;
                if has_any_name_anchor(candidate) {
                    confidence = (confidence + 0.05).min(0.95);
                }

                let start_u16 = byte_to_utf16(&map, m.start());
                let end_u16 = byte_to_utf16(&map, m.end());
                out.push(NameDetection {
                    character_start: start_u16,
                    character_end: end_u16,
                    text: candidate.to_string(),
                    confidence,
                    pattern: (*label).to_string(),
                });
            }
        }

        // Standalone ALL CAPS names: noisy, so require a dictionary anchor.
        for caps in REGEX_STANDALONE_ALLCAPS.captures_iter(&text) {
            let m = match caps.get(1) {
                Some(v) => v,
                None => continue,
            };
            let candidate = m.as_str();
            if candidate.contains(',') {
                continue;
            }
            let words: Vec<&str> = candidate.split_whitespace().collect();
            if words.len() < 2 || words.len() > 3 {
                continue;
            }
            if words.iter().any(|w| is_excluded_allcaps_acronym(w)) {
                continue;
            }
            if !has_any_name_anchor(candidate) {
                continue;
            }

            let start_u16 = byte_to_utf16(&map, m.start());
            let end_u16 = byte_to_utf16(&map, m.end());
            out.push(NameDetection {
                character_start: start_u16,
                character_end: end_u16,
                text: candidate.to_string(),
                confidence: 0.86,
                pattern: "Rust Standalone all caps".to_string(),
            });
        }

        // Concatenated names (no space): "JohnSmith"
        for caps in REGEX_CONCATENATED_NAME.captures_iter(&text) {
            let m = match caps.get(0) {
                Some(v) => v,
                None => continue,
            };
            let candidate = m.as_str();
            // Anchor to avoid catching arbitrary CamelCase identifiers.
            if !has_any_name_anchor(candidate) {
                continue;
            }
            let start_u16 = byte_to_utf16(&map, m.start());
            let end_u16 = byte_to_utf16(&map, m.end());
            out.push(NameDetection {
                character_start: start_u16,
                character_end: end_u16,
                text: candidate.to_string(),
                confidence: 0.82,
                pattern: "Rust Concatenated name".to_string(),
            });
        }

        // Deduplicate by span range, keeping highest confidence.
        let mut best: HashMap<u64, NameDetection> = HashMap::new();
        for d in out {
            let key = ((d.character_start as u64) << 32) | (d.character_end as u64);
            match best.get(&key) {
                None => {
                    best.insert(key, d);
                }
                Some(existing) => {
                    if d.confidence > existing.confidence {
                        best.insert(key, d);
                    }
                }
            }
        }

        let mut deduped: Vec<NameDetection> = best.into_values().collect();
        deduped.sort_by(|a, b| a.character_start.cmp(&b.character_start));
        deduped
    }
}
