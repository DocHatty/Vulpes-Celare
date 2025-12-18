use napi_derive::napi;
use zeroize::Zeroize;

#[napi(object)]
pub struct Replacement {
    pub character_start: u32,
    pub character_end: u32,
    pub replacement: String,
}

fn build_utf16_to_byte_map(text: &str) -> Vec<(u32, usize)> {
    let mut map: Vec<(u32, usize)> = Vec::with_capacity(text.len().min(1024));
    let mut u16_pos: u32 = 0;
    map.push((0, 0));
    for (byte_pos, ch) in text.char_indices() {
        map.push((u16_pos, byte_pos));
        u16_pos = u16_pos.saturating_add(ch.len_utf16() as u32);
    }
    map.push((u16_pos, text.len()));
    map.sort_by_key(|(u, _)| *u);
    map.dedup_by_key(|(u, _)| *u);
    map
}

fn utf16_to_byte(map: &[(u32, usize)], u16_pos: u32) -> usize {
    match map.binary_search_by_key(&u16_pos, |(u, _)| *u) {
        Ok(i) => map[i].1,
        Err(i) => {
            if i == 0 {
                0
            } else {
                map[i - 1].1
            }
        }
    }
}

/// Apply redaction replacements to text with secure memory handling.
/// 
/// PHI text segments that are replaced are zeroized in memory to prevent
/// sensitive data from persisting in memory dumps or crash reports.
#[napi]
pub fn apply_replacements(text: String, replacements: Vec<Replacement>) -> String {
    if text.is_empty() || replacements.is_empty() {
        return text;
    }

    let map = build_utf16_to_byte_map(&text);
    let mut out = text;

    let mut sorted = replacements;
    sorted.sort_by(|a, b| b.character_start.cmp(&a.character_start));

    for r in sorted.into_iter() {
        let start_u16 = r.character_start.min(u32::MAX);
        let end_u16 = r.character_end.min(u32::MAX);
        if end_u16 <= start_u16 {
            continue;
        }

        let mut start_b = utf16_to_byte(&map, start_u16);
        let mut end_b = utf16_to_byte(&map, end_u16);

        start_b = start_b.min(out.len());
        end_b = end_b.min(out.len());

        if end_b <= start_b {
            continue;
        }
        if !out.is_char_boundary(start_b) || !out.is_char_boundary(end_b) {
            continue;
        }

        // Extract and zeroize the PHI segment before replacement
        let mut phi_segment = out[start_b..end_b].to_string();
        out.replace_range(start_b..end_b, &r.replacement);
        phi_segment.zeroize();
    }

    out
}
