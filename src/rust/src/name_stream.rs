use crate::name::{
    build_utf16_index_map, byte_to_utf16, first_token_lower, in_dict_with_ocr, is_valid_part,
    normalize_ocr_chars, NameDetection, REGEX_CHAOS_LAST_FIRST, REGEX_FIRST_LAST, REGEX_LAST_FIRST,
    REGEX_LOWER_LAST_FIRST,
};
use napi_derive::napi;
use std::collections::{HashMap, HashSet};

fn utf16_len(s: &str) -> u32 {
    s.encode_utf16().count() as u32
}

fn byte_index_at_utf16(s: &str, target_u16: u32) -> usize {
    if target_u16 == 0 {
        return 0;
    }
    let mut u16_pos: u32 = 0;
    for (byte_pos, ch) in s.char_indices() {
        let next = u16_pos.saturating_add(ch.len_utf16() as u32);
        if next > target_u16 {
            return byte_pos;
        }
        u16_pos = next;
        if u16_pos == target_u16 {
            return byte_pos + ch.len_utf8();
        }
    }
    s.len()
}

fn tail_by_utf16(s: &str, keep_u16: u32) -> String {
    if keep_u16 == 0 {
        return String::new();
    }
    let total = utf16_len(s);
    if total <= keep_u16 {
        return s.to_string();
    }
    let start_u16 = total.saturating_sub(keep_u16);
    let byte_start = byte_index_at_utf16(s, start_u16);
    s[byte_start..].to_string()
}

fn scan_last_first(
    first_names: &HashSet<String>,
    surnames: &HashSet<String>,
    text: &str,
) -> Vec<NameDetection> {
    if text.is_empty() {
        return vec![];
    }

    let map = build_utf16_index_map(text);
    let mut out: Vec<NameDetection> = Vec::new();

    let mut scan = |re: &regex::Regex, base_conf: f64, pattern: &str| {
        for caps in re.captures_iter(text) {
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

            let last_in = surnames.contains(&normalized_last);
            let first_in = first_names.contains(&normalized_first);
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

fn scan_first_last(
    first_names: &HashSet<String>,
    surnames: &HashSet<String>,
    text: &str,
) -> Vec<NameDetection> {
    if text.is_empty() {
        return vec![];
    }
    let map = build_utf16_index_map(text);
    let mut out: Vec<NameDetection> = Vec::new();

    for caps in REGEX_FIRST_LAST.captures_iter(text) {
        let m = match caps.get(0) {
            Some(v) => v,
            None => continue,
        };

        let first = caps.get(1).map(|v| v.as_str()).unwrap_or("");
        let last = caps.get(2).map(|v| v.as_str()).unwrap_or("");
        if first.is_empty() || last.is_empty() {
            continue;
        }

        let first_is_first = in_dict_with_ocr(first_names, first);
        let first_is_last = in_dict_with_ocr(surnames, first);
        let last_is_last = in_dict_with_ocr(surnames, last);
        let last_is_first = in_dict_with_ocr(first_names, last);

        if !(first_is_first || first_is_last || last_is_last || last_is_first) {
            continue;
        }

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

#[napi]
pub struct VulpesStreamingNameScanner {
    first_names: HashSet<String>,
    surnames: HashSet<String>,
    initialized: bool,
    overlap_utf16: u32,
    tail: String,
    tail_len_utf16: u32,
    total_len_utf16: u32,
}

#[napi]
impl VulpesStreamingNameScanner {
    #[napi(constructor)]
    pub fn new(overlap_utf16: u32) -> Self {
        Self {
            first_names: HashSet::new(),
            surnames: HashSet::new(),
            initialized: false,
            overlap_utf16,
            tail: String::new(),
            tail_len_utf16: 0,
            total_len_utf16: 0,
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
    pub fn reset(&mut self) {
        self.tail.clear();
        self.tail_len_utf16 = 0;
        self.total_len_utf16 = 0;
    }

    /// Push a chunk and return new name detections that end in (or after) the new chunk.
    #[napi]
    pub fn push(&mut self, chunk: String) -> Vec<NameDetection> {
        if !self.initialized || chunk.is_empty() {
            self.total_len_utf16 = self.total_len_utf16.saturating_add(utf16_len(&chunk));
            return vec![];
        }

        let chunk_len = utf16_len(&chunk);
        let chunk_start_global = self.total_len_utf16;

        let combined = format!("{}{}", self.tail, chunk);
        let combined_start_global = chunk_start_global.saturating_sub(self.tail_len_utf16);

        let mut detections = Vec::new();
        detections.extend(scan_last_first(&self.first_names, &self.surnames, &combined));
        detections.extend(scan_first_last(&self.first_names, &self.surnames, &combined));

        for d in detections.iter_mut() {
            d.character_start = d.character_start.saturating_add(combined_start_global);
            d.character_end = d.character_end.saturating_add(combined_start_global);
        }

        // Only return detections that end in (or after) the new chunk start
        // to avoid re-emitting detections that were entirely within the overlap tail.
        detections.retain(|d| d.character_end > chunk_start_global);

        // Update rolling tail for next push.
        let new_tail = tail_by_utf16(&combined, self.overlap_utf16);
        self.tail_len_utf16 = utf16_len(&new_tail);
        self.tail = new_tail;
        self.total_len_utf16 = self.total_len_utf16.saturating_add(chunk_len);

        detections.sort_by(|a, b| a.character_start.cmp(&b.character_start));
        detections
    }
}
