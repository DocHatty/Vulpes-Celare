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

#[napi(object)]
pub struct StreamingKernelStats {
    pub buffer_len_utf16: u32,
    pub last_sentence_end_utf16: u32,
    pub last_whitespace_utf16: u32,
}

#[napi]
pub struct VulpesStreamingKernel {
    buffer: String,
    mode: String,
    buffer_size: u32,
    overlap: u32,
    buffer_len_utf16: u32,
    last_sentence_end_utf16: u32,
    last_whitespace_utf16: u32,
    prev_char: Option<char>,
}

#[napi]
impl VulpesStreamingKernel {
    #[napi(constructor)]
    pub fn new(mode: String, buffer_size: u32, overlap: u32) -> Self {
        Self {
            buffer: String::new(),
            mode,
            buffer_size: buffer_size.max(1),
            overlap,
            buffer_len_utf16: 0,
            last_sentence_end_utf16: 0,
            last_whitespace_utf16: 0,
            prev_char: None,
        }
    }

    #[napi]
    pub fn reset(&mut self) {
        self.buffer.clear();
        self.buffer_len_utf16 = 0;
        self.last_sentence_end_utf16 = 0;
        self.last_whitespace_utf16 = 0;
        self.prev_char = None;
    }

    #[napi]
    pub fn push(&mut self, chunk: String) {
        if chunk.is_empty() {
            return;
        }

        for ch in chunk.chars() {
            let next_u16 = self.buffer_len_utf16.saturating_add(ch.len_utf16() as u32);

            if ch.is_whitespace() {
                self.last_whitespace_utf16 = next_u16;
            }

            if let Some(prev) = self.prev_char {
                let prev_is_end = prev == '.' || prev == '!' || prev == '?';
                if prev_is_end && ch.is_whitespace() {
                    self.last_sentence_end_utf16 = self.buffer_len_utf16;
                }
            }

            self.prev_char = Some(ch);
            self.buffer_len_utf16 = next_u16;
        }

        self.buffer.push_str(&chunk);
    }

    #[napi]
    pub fn get_stats(&self) -> StreamingKernelStats {
        StreamingKernelStats {
            buffer_len_utf16: self.buffer_len_utf16,
            last_sentence_end_utf16: self.last_sentence_end_utf16,
            last_whitespace_utf16: self.last_whitespace_utf16,
        }
    }

    /// Returns a segment (prefix) that can be safely processed/emitted now, keeping `overlap`
    /// characters buffered for cross-chunk PHI continuity.
    ///
    /// `force=true` returns the entire remaining buffer (no overlap retention).
    #[napi]
    pub fn pop_segment(&mut self, force: Option<bool>) -> Option<String> {
        if self.buffer.is_empty() {
            return None;
        }

        let force = force.unwrap_or(false);
        let mut flush_point = 0u32;

        if force {
            flush_point = self.buffer_len_utf16;
        } else if self.mode == "sentence" {
            if self.last_sentence_end_utf16 > 0 {
                flush_point = self.last_sentence_end_utf16;
            }
        } else {
            // "immediate" mode: flush at buffer_size (prefer last whitespace before it).
            if self.buffer_len_utf16 >= self.buffer_size {
                if self.last_whitespace_utf16 > 0 && self.last_whitespace_utf16 <= self.buffer_size {
                    flush_point = self.last_whitespace_utf16;
                } else {
                    flush_point = self.buffer_size;
                }
            }
        }

        // Safety valve to avoid unbounded buffering.
        if !force && flush_point == 0 && self.buffer_len_utf16 >= self.buffer_size.saturating_mul(2) {
            flush_point = self.buffer_size;
        }

        if flush_point == 0 {
            return None;
        }

        let stable_end = if force {
            flush_point
        } else {
            flush_point.saturating_sub(self.overlap)
        };

        if stable_end == 0 {
            return None;
        }

        let byte_end = byte_index_at_utf16(&self.buffer, stable_end);
        let segment = self.buffer[..byte_end].to_string();

        // Remove segment from buffer.
        let remaining = self.buffer[byte_end..].to_string();
        self.buffer = remaining;

        // Recompute utf16 length and boundary state for the remaining buffer.
        self.buffer_len_utf16 = utf16_len(&self.buffer);
        if force {
            self.last_sentence_end_utf16 = 0;
            self.last_whitespace_utf16 = 0;
            self.prev_char = self.buffer.chars().last();
            return Some(segment);
        }

        self.last_sentence_end_utf16 = self.last_sentence_end_utf16.saturating_sub(stable_end);
        self.last_whitespace_utf16 = self.last_whitespace_utf16.saturating_sub(stable_end);
        self.prev_char = self.buffer.chars().last();

        Some(segment)
    }
}
