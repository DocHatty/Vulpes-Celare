use crate::scan::{scan_all_identifiers, IdentifierDetection};
use napi_derive::napi;

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

#[napi]
pub struct VulpesStreamingIdentifierScanner {
    overlap_utf16: u32,
    tail: String,
    tail_len_utf16: u32,
    total_len_utf16: u32,
}

#[napi]
impl VulpesStreamingIdentifierScanner {
    #[napi(constructor)]
    pub fn new(overlap_utf16: u32) -> Self {
        Self {
            overlap_utf16,
            tail: String::new(),
            tail_len_utf16: 0,
            total_len_utf16: 0,
        }
    }

    #[napi]
    pub fn reset(&mut self) {
        self.tail.clear();
        self.tail_len_utf16 = 0;
        self.total_len_utf16 = 0;
    }

    /// Push a chunk and return new identifier detections that end in (or after) the new chunk.
    ///
    /// This is a stateful streaming scan: it only scans `overlap + new_chunk`, not the whole stream,
    /// while still detecting identifiers that cross chunk boundaries.
    #[napi]
    pub fn push(&mut self, chunk: String) -> Vec<IdentifierDetection> {
        if chunk.is_empty() {
            return vec![];
        }

        let chunk_len = utf16_len(&chunk);
        let chunk_start_global = self.total_len_utf16;

        let combined = format!("{}{}", self.tail, chunk);
        let combined_start_global = chunk_start_global.saturating_sub(self.tail_len_utf16);

        let mut detections = scan_all_identifiers(combined);
        for d in detections.iter_mut() {
            d.character_start = d.character_start.saturating_add(combined_start_global);
            d.character_end = d.character_end.saturating_add(combined_start_global);
        }

        // Avoid re-emitting detections that were entirely within the previous overlap tail.
        detections.retain(|d| d.character_end > chunk_start_global);

        self.total_len_utf16 = self.total_len_utf16.saturating_add(chunk_len);
        self.tail = tail_by_utf16(&format!("{}{}", self.tail, chunk), self.overlap_utf16);
        self.tail_len_utf16 = utf16_len(&self.tail);

        detections.sort_by(|a, b| a.character_start.cmp(&b.character_start));
        detections
    }
}
