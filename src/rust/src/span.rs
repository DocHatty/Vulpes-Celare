use napi_derive::napi;
use std::collections::HashMap;

#[napi(object)]
pub struct SpanLite {
    pub character_start: u32,
    pub character_end: u32,
    pub filter_type: String,
    pub confidence: f64,
    pub priority: u32,
    pub text: Option<String>,  // Optional for backward compatibility
}

#[derive(Clone)]
struct ScoredSpan {
    index: usize,
    character_start: u32,
    character_end: u32,
    length: u32,
    confidence: f64,
    score: f64,
    type_spec: u32,
}

fn type_specificity(filter_type: &str) -> u32 {
    match filter_type {
        "SSN" => 100,
        "MRN" => 95,
        "CREDIT_CARD" => 90,
        "ACCOUNT" | "LICENSE" | "PASSPORT" | "IBAN" | "HEALTH_PLAN" => 85,
        "EMAIL" => 80,
        "PHONE" | "FAX" | "IP" | "URL" | "MAC_ADDRESS" | "BITCOIN" => 75,
        "VEHICLE" | "DEVICE" | "BIOMETRIC" => 70,
        "DATE" => 60,
        "ZIPCODE" => 55,
        "ADDRESS" => 50,
        "CITY" | "STATE" | "COUNTY" => 45,
        "AGE" | "RELATIVE_DATE" => 40,
        "PROVIDER_NAME" => 36,
        "NAME" => 35,
        "OCCUPATION" => 30,
        "CUSTOM" => 20,
        _ => 25,
    }
}

/// Structure words that indicate a NAME span likely includes non-name text
const NAME_STRUCTURE_WORDS: &[&str] = &[
    "DATE", "BIRTH", "RECORD", "NUMBER", "PHONE", "ADDRESS", "EMAIL",
    "MEMBER", "ACCOUNT", "STATUS", "DOB", "MRN", "SSN", "ID",
];

/// Check if text contains any structure word
fn contains_structure_word(text: &str) -> bool {
    let upper = text.to_uppercase();
    for word in upper.split_whitespace() {
        if NAME_STRUCTURE_WORDS.contains(&word.trim_matches(|c: char| !c.is_alphanumeric())) {
            return true;
        }
    }
    false
}

fn calculate_score(
    len: u32,
    confidence: f64,
    type_spec: u32,
    priority: u32,
    filter_type: &str,
    text: Option<&str>,
) -> f64 {
    let mut length_score = ((len as f64 / 50.0).min(1.0)) * 40.0;

    // Penalize NAME spans that contain structure words (like "Date", "Birth", etc.)
    // These are likely over-extended spans that grabbed adjacent field labels
    if filter_type == "NAME" {
        if let Some(t) = text {
            if contains_structure_word(t) {
                length_score = 0.0; // Severe penalty - prefer shorter correct span
            }
        }
    }

    let confidence_score = confidence * 30.0;
    let type_score = ((type_spec as f64 / 100.0).min(1.0)) * 20.0;
    let priority_score = (((priority as f64) / 100.0).min(1.0)) * 10.0;
    length_score + confidence_score + type_score + priority_score
}

fn overlaps(a_start: u32, a_end: u32, b_start: u32, b_end: u32) -> bool {
    !(a_end <= b_start || a_start >= b_end)
}

fn contains(a_start: u32, a_end: u32, b_start: u32, b_end: u32) -> bool {
    a_start <= b_start && a_end >= b_end
}

#[napi]
pub fn drop_overlapping_spans(spans: Vec<SpanLite>) -> Vec<u32> {
    if spans.is_empty() {
        return vec![];
    }
    if spans.len() == 1 {
        return vec![0];
    }

    // STEP 1: Remove exact duplicates (same position + type) keeping highest confidence.
    let mut unique_map: HashMap<String, usize> = HashMap::new();
    for (i, s) in spans.iter().enumerate() {
        let key = format!("{}-{}-{}", s.character_start, s.character_end, s.filter_type);
        match unique_map.get(&key) {
            None => {
                unique_map.insert(key, i);
            }
            Some(&existing_idx) => {
                if spans[existing_idx].confidence < s.confidence {
                    unique_map.insert(key, i);
                }
            }
        }
    }

    let mut scored: Vec<ScoredSpan> = Vec::with_capacity(unique_map.len());
    for idx in unique_map.values().copied() {
        let s = &spans[idx];
        let len = s.character_end.saturating_sub(s.character_start);
        let spec = type_specificity(&s.filter_type);
        scored.push(ScoredSpan {
            index: idx,
            character_start: s.character_start,
            character_end: s.character_end,
            length: len,
            confidence: s.confidence,
            score: calculate_score(
                len,
                s.confidence,
                spec,
                s.priority,
                &s.filter_type,
                s.text.as_deref(),
            ),
            type_spec: spec,
        });
    }

    if scored.len() == 1 {
        return vec![scored[0].index as u32];
    }

    // STEP 2: Sort by score (desc), then position (asc), then length (desc).
    scored.sort_by(|a, b| {
        if (a.score - b.score).abs() > 0.001 {
            return b
                .score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal);
        }
        if a.character_start != b.character_start {
            return a.character_start.cmp(&b.character_start);
        }
        b.length.cmp(&a.length)
    });

    // STEP 3: Greedy overlap removal with containment logic (matches TS behavior).
    let mut kept: Vec<ScoredSpan> = Vec::new();

    'outer: for cand in scored.into_iter() {
        let mut should_keep = true;
        let mut replace_idx: Option<usize> = None;

        for (i, existing) in kept.iter().enumerate() {
            if !overlaps(
                cand.character_start,
                cand.character_end,
                existing.character_start,
                existing.character_end,
            ) {
                continue;
            }

            let cand_contains_existing = contains(
                cand.character_start,
                cand.character_end,
                existing.character_start,
                existing.character_end,
            );
            let existing_contains_cand = contains(
                existing.character_start,
                existing.character_end,
                cand.character_start,
                cand.character_end,
            );

            if cand_contains_existing {
                if cand.type_spec <= existing.type_spec {
                    should_keep = false;
                    break;
                }
            } else if existing_contains_cand {
                if cand.type_spec > existing.type_spec && cand.confidence >= 0.9 {
                    replace_idx = Some(i);
                    break;
                }
                should_keep = false;
                break;
            } else {
                should_keep = false;
                break;
            }
        }

        if let Some(i) = replace_idx {
            kept[i] = cand;
            continue 'outer;
        }

        if should_keep {
            kept.push(cand);
        }
    }

    kept.sort_by(|a, b| a.character_start.cmp(&b.character_start));
    kept.into_iter().map(|s| s.index as u32).collect()
}
