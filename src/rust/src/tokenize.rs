use napi_derive::napi;

#[napi(object)]
pub struct TokenWithPosition {
    pub text: String,
    pub start: u32,
    pub end: u32,
}

fn is_word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

#[napi]
pub fn tokenize_with_positions(text: String, include_punctuation: bool) -> Vec<TokenWithPosition> {
    let bytes = text.as_bytes();
    let mut out: Vec<TokenWithPosition> = Vec::new();

    let mut i: usize = 0;
    while i < bytes.len() {
        let b = bytes[i];

        // Whitespace: skip.
        if b.is_ascii_whitespace() {
            i += 1;
            continue;
        }

        // Word token (\w+)
        if is_word_byte(b) {
            let start = i;
            i += 1;
            while i < bytes.len() && is_word_byte(bytes[i]) {
                i += 1;
            }
            // Safe: we only cut on byte boundaries for ASCII word bytes.
            let token = &text[start..i];
            out.push(TokenWithPosition {
                text: token.to_string(),
                start: start as u32,
                end: i as u32,
            });
            continue;
        }

        // Punctuation token ([^\w\s]) as single char (ASCII only here).
        if include_punctuation {
            let start = i;
            i += 1;
            let token = &text[start..i];
            out.push(TokenWithPosition {
                text: token.to_string(),
                start: start as u32,
                end: i as u32,
            });
            continue;
        }

        // Not a word and punctuation excluded: skip.
        i += 1;
    }

    out
}
