use napi_derive::napi;
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashSet;

#[napi(object)]
pub struct IdentifierDetection {
    pub filter_type: String,
    pub character_start: u32,
    pub character_end: u32,
    pub text: String,
    pub confidence: f64,
    pub pattern: String,
}

fn build_utf16_index_map(text: &str) -> Vec<(usize, u32)> {
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

fn byte_to_utf16(map: &[(usize, u32)], byte_pos: usize) -> u32 {
    match map.binary_search_by_key(&byte_pos, |(b, _)| *b) {
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

fn prev_char_boundary(text: &str, mut idx: usize) -> usize {
    if idx > text.len() {
        idx = text.len();
    }
    while idx > 0 && !text.is_char_boundary(idx) {
        idx -= 1;
    }
    idx
}

fn next_char_boundary(text: &str, mut idx: usize) -> usize {
    if idx > text.len() {
        idx = text.len();
    }
    while idx < text.len() && !text.is_char_boundary(idx) {
        idx += 1;
    }
    idx
}

// =============================================================================
// EMAIL
// =============================================================================

static EMAIL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b").expect("invalid EMAIL_RE")
});

// =============================================================================
// IP (IPv4) + validation
// =============================================================================

static IPV4_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b").expect("invalid IPV4_RE"));

fn is_valid_ipv4(ip: &str) -> bool {
    let mut parts = ip.split('.');
    let mut count = 0;
    while let Some(p) = parts.next() {
        count += 1;
        if count > 4 {
            return false;
        }
        if p.is_empty() || p.len() > 3 {
            return false;
        }
        let n: u32 = match p.parse() {
            Ok(v) => v,
            Err(_) => return false,
        };
        if n > 255 {
            return false;
        }
    }
    count == 4
}

// =============================================================================
// URL (ports JS patterns into Rust)
// =============================================================================

static URL_PATTERNS: Lazy<Vec<(Regex, &'static str, f64)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r#"(?i)\b(?:https?://|ftp://|www\.)[^\s<>"{}|\\^`\[\]]+"#)
                .expect("invalid URL standard"),
            "Standard URL",
            0.95,
        ),
        (
            Regex::new(r#"(?i)\b(?:mychart|myhealth|patient(?:portal)?|epic|cerner|athena|meditech|allscripts|nextgen)[.\-]?[a-z0-9.\-]+\.(?:com|org|net|edu|health|healthcare|med|medical)[^\s<>"{}|\\^`\[\]]*(?:\?[^\s<>"{}|\\^`\[\]]*(?:patient|member|account|user|id|mrn)[^\s<>"{}|\\^`\[\]]*)?"#)
                .expect("invalid URL patient portal"),
            "Patient portal URL",
            0.92,
        ),
        (
            Regex::new(r#"(?i)\b[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}[^\s<>"{}|\\^`\[\]]*\?[^\s<>"{}|\\^`\[\]]*(?:patientid|patient_id|memberid|member_id|accountid|account_id|userid|user_id|mrnid|mrn)=[^\s<>"{}|\\^`\[\]]+"#)
                .expect("invalid URL patient id"),
            "Patient ID URL",
            0.93,
        ),
        (
            Regex::new(r#"(?i)\b[a-z0-9][a-z0-9.\-]*(?:hospital|medical|health|clinic|care|med|healthcare|physician|doctor|patient)[a-z0-9.\-]*\.[a-z]{2,}[^\s<>"{}|\\^`\[\]]*"#)
                .expect("invalid URL healthcare"),
            "Healthcare domain",
            0.85,
        ),
        (
            Regex::new(r#"(?i)\b(?:linkedin\.com/in/|facebook\.com/|twitter\.com/|instagram\.com/|x\.com/)[^\s<>"{}|\\^`\[\]]+"#)
                .expect("invalid URL social"),
            "Social media profile",
            0.9,
        ),
    ]
});

fn overlaps(a_start: u32, a_end: u32, b_start: u32, b_end: u32) -> bool {
    !(a_end <= b_start || a_start >= b_end)
}

// =============================================================================
// OCR normalization (matches ValidationUtils.normalizeOCR)
// =============================================================================

fn normalize_ocr_map(ch: char) -> char {
    match ch {
        'O' | 'o' => '0',
        'l' | 'I' | '|' => '1',
        'B' => '8',
        'b' => '6',
        'S' | 's' => '5',
        'Z' | 'z' => '2',
        'G' => '6',
        'g' | 'q' => '9',
        _ => ch,
    }
}

fn normalize_ocr_text(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        out.push(normalize_ocr_map(ch));
    }
    out
}

// =============================================================================
// PHONE (ported from PhoneFilterSpan patterns)
// =============================================================================

static PHONE_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"(\+?1[-. \t]?)?\(?\d{3}\)?[-. \t]?\d{3}[-. \t]?\d{4}(?:[ \t]*(?:ext\.?|x|extension)[ \t]*[A-Z0-9]{1,6})?\b",
        r"(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-][A-Z]{4,7}\b",
        r"(\+?1[-.]?)?\(?\d{3}\)?[-.]?[A-Z0-9]{2,3}[-][A-Z]{4,7}\b",
        r"\+44[ \t]*\(?0?\)?[ \t]*\d{2,4}[ \t.-]?\d{3,4}[ \t.-]?\d{3,4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+44[ \t]*7\d{3}[ \t.-]?\d{3}[ \t.-]?\d{3}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\b0\d{2,4}[ \t.-]?\d{3,4}[ \t.-]?\d{3,4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+33[ \t]*\(?0?\)?[ \t]*[1-9](?:[ \t.-]?\d{2}){4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\b0[1-9](?:[ \t.-]?\d{2}){4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+49[ \t]*\(?0?\)?[ \t]*\d{2,5}[ \t.-]?\d{3,8}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+61[ \t]*\(?0?\)?[ \t]*[2-9][ \t.-]?\d{4}[ \t.-]?\d{4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\b\(?0[2-9]\)?[ \t.-]?\d{4}[ \t.-]?\d{4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+[1-9]\d{0,2}[ \t.-]?\d{2,5}[ \t.-]?\d{3,5}[ \t.-]?\d{3,5}(?:[ \t]*(?:ext\.?|extn|x|extension)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\+[1-9]\d{0,2}[ \t.-]?\(?\d{1,4}\)?(?:[ \t.-]?\d{1,4}){2,4}(?:[ \t]*(?:ext\.?|x|extension)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\(\+[1-9]\d{0,2}\)[ \t.-]*\d{2,4}[ \t.-]?\d{3,5}[ \t.-]?\d{3,5}(?:[ \t]*(?:ext\.?|extn|x|extension)[ \t]*[A-Z0-9]{1,6})?\b",
        r"\.?\d{3}\.?[ \t]*\d{3}\.\d{4}\b",
        r"\(?[Ss5]\d{2}\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b",
        r"\d{3}[ \t.-]?\d{3}[ \t.-]?\d{2}[lI1]\d\b",
        r"\(\d{2}\)[ \t]*\d{3}[ \t.-]?\d{4}\b",
        r"\d{3}[ \t.-]?\d{1,2}[ \t]+\d{1,2}[ \t.-]?\d{4}\b",
        r"\d{3}[ \t.-]?[Ss5]\d{2}[ \t.-]?\d{4}\b",
        r"\d{3}[ \t.-]?\d?[B8]\d[ \t.-]?\d{4}\b",
        r"\d{3}-[ \t]+\d{3}[ \t.-]?\d{4}\b",
        r"\d{3}[ \t]{2,}\d{3}[ \t.-]?\d{4}\b",
        r"[0-9s]{3}[ \t.-]?[0-9s]{3}[ \t.-]?[0-9s]{4}\b",
        r"[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{4}\b",
        r"\(?[0-9OoSsBb]{3}\)?[ \t.-]?[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{4}\b",
        r"\(?\d{1,2}\s*\d?\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b",
        r"\+?1?[ \t.-]?\(?\d\s+\d{2}\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b",
        r"\d{2,3}--\d{3,4}-\d{4}\b",
        r"\d{2,4}\.\d{2,4}\.\d{4}\b",
        r"\b\d{2,3}\s+\d{3}\s+\d{4}[A-Za-z]?\b",
        r"\d{3}[-.]?\d{4,5}[-.]?\d{3,4}\b",
        r"\+?1?[ \t.-]?\(?[0-9gGqQOoIlSsBb|]{2,3}\)?[ \t.-]?[0-9gGqQOoIlSsBb|]{3,4}[-.]?[0-9gGqQOoIlSsBb|]{3,4}\b",
        r"\bFa?\s*x?\s*\d{3}[ \t.-]?\d{3}[ \t.-]?\d{3,4}[A-Za-z]?\d?\b",
        r"\b\d{3}\s+\d{3}\s+\d{3}\b",
        r"\b[A-Za-z]\d{9}\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid PHONE pattern"))
        .collect()
});

fn phone_confidence(phone: &str) -> f64 {
    let mut conf = 0.9;
    if phone.starts_with('+') {
        conf = 0.95;
    }
    let lower = phone.to_ascii_lowercase();
    if lower.contains("ext") || lower.contains("extension") || lower.contains('x') {
        conf = 0.95;
    }
    conf
}

fn is_npi_label_before(source: &str, byte_start: usize) -> bool {
    let window_start = prev_char_boundary(source, byte_start.saturating_sub(20));
    let byte_start = prev_char_boundary(source, byte_start);
    let prefix = &source[window_start..byte_start];
    prefix.to_ascii_lowercase().contains("npi")
}

// =============================================================================
// SSN (ported patterns + permissive validation)
// =============================================================================

static SSN_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    // Replace \u2013 with the literal EN DASH to match the JS source intent.
    let sources: Vec<&str> = vec![
        r"\b(\d{3})-(\d{2})-(\d{4})\b",
        r"\b(\d{3})[ \t](\d{2})[ \t](\d{4})\b",
        r"\b(\d{3})[–.](\d{2})[–.](\d{4})\b",
        r"\b\d{3}\s*[-.–]\s*\d{2}\s*[-.–]\s*\d{4}\b",
        r"\b\d{2}-\d{3}-\d{4}\b",
        r"\b(\d{9})\b",
        r"[\*Xx]{3}-[\*Xx]{2}-(\d{4})\b",
        r"[\*Xx]{3}[\*Xx]{2}(\d{4})\b",
        r"\b(\d{3})-(\d{2})-[\*Xx]{4}",
        r"\b\d{3}--\d{2}-\d{4}\b",
        r"\b\d{3}-\d{2}--\d{4}\b",
        r"\b\d{3}-\d\s+\d-\d{4}\b",
        r"\b\d{3}-\d{2}-\d\s+\d{3}\b",
        r"\b[0-9BOSZIlGg|o]{3}-[0-9BOSZIlGg|o]{2}-[0-9BOSZIlGg|o]{3,4}\b",
        r"\b\d{2}\s*\d{2}[O0]{2}\s*\d{4}\b",
        r"\b\d{3}[-\s]*[O0]{2}[-\s]*\d{4}\b",
        r"[\*Xx]{3}-[\*Xx]\s+[\*Xx]-\d{4}\b",
        r"[\*Xx]{3}-[\*Xx]\s*[\*Xx]-\d{4}\b",
        r"[\*Xx]{3}-[\*Xx]{3}-\d{4}\b",
        r"[\*Xx]{2}-[\*Xx]{3}-\d{4}\b",
        r"[\*Xx]{3}-[\*Xx]{2}--\d{4}\b",
        r"[\*Xx]{3}-[\*Xx]{2}\d-\d{3,4}\b",
        r"[\*Xx]{3}-[\*Xx]{2}-\d{2,3}[A-Za-z]?\b",
        r"[\*Xx]{3}-?\s*[\*Xx]{2}-\d{4}\b",
        r"\b\d{3}-\d\s+\d-\d{3}\b",
        r"\b[0-9BOSZIlGgqQ|o]{8,9}\b",
        r"\b\d{3}-\d{3}-\d{3}\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(s).expect("invalid SSN pattern"))
        .collect()
});

fn is_valid_ssn(ssn: &str) -> bool {
    let compact: String = ssn.chars().filter(|c| !c.is_whitespace()).collect();

    // Partially masked patterns must be redacted even if not parseable.
    let has_mask = compact.chars().any(|c| c == '*' || c == 'X' || c == 'x');
    if has_mask {
        let digit_count = compact.chars().filter(|c| c.is_ascii_digit()).count();
        let mask_count = compact
            .chars()
            .filter(|c| *c == '*' || *c == 'X' || *c == 'x')
            .count();

        // Very permissive: if it looks like an SSN mask and has some digits, accept.
        if digit_count >= 3 && mask_count >= 2 {
            return true;
        }
    }

    // Normalize a subset of OCR letters into digits.
    let normalized: String = ssn
        .chars()
        .map(|c| match c {
            'B' => '8',
            'O' => '0',
            'S' => '5',
            'Z' => '2',
            'I' | 'l' | '|' => '1',
            'g' | 'G' => '9',
            _ => c,
        })
        .collect();

    let digits: String = normalized.chars().filter(|c| c.is_ascii_digit()).collect();
    let len = digits.len();
    len >= 8 && len <= 9
}

// =============================================================================
// NPI (explicitly labeled)
// =============================================================================

static NPI_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\bNPI(?:\s+(?:Number|No|#))?\s*[#:]*\s*([0-9]{10})\b").expect("invalid NPI_RE")
});

// =============================================================================
// ZIP CODE
// =============================================================================

static ZIP_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"\b\d{5}-\d{4}\b",
        r"\b\d{5}\b",
        r"\b[A-Z]\s*[A-Z](\d{5})(?:-\d{4})?\b",
        r"\b[A-Z]{2}(\d{5})(?:-\d{4})?\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid ZIP pattern"))
        .collect()
});

// =============================================================================
// FAX (explicit label; separate from PHONE for specificity)
// =============================================================================

static FAX_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"\b(?:Fax|FAX)(?:\s+(?:Number|No|#))?\s*[#:]?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b",
        r"\b(?:send|fax|transmit)(?:\s+(?:to|results))?\s+(?:fax)?\s*[#:]?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid FAX pattern"))
        .collect()
});

fn is_valid_us_phone_like(phone_number: &str) -> bool {
    let digits: String = phone_number
        .chars()
        .filter(|c| c.is_ascii_digit())
        .collect();
    if digits.len() == 10 {
        return true;
    }
    digits.len() == 11 && digits.starts_with('1')
}

// =============================================================================
// MRN
// =============================================================================

static MRN_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"\b(?:MRN?|Medical\s+Record(?:\s+Number)?)(?:\s*\([^)]+\))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b",
        r"\b(?:Chart)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b",
        r"\b(?:Record)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b",
        r"\b(?:Patient)(?:\s+(?:ID|Number|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b",
        r"\b(?:FILE|File)\s*(?:[:#]\s*)?#?\s*(\d{4,14})\b",
        r"\b(?:Case)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b",
        r"\b(?:Accession)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b",
        r"\b((?:PAT|PT|MRN|PATIENT|MR|REC|CHART|CASE|ACC)_[A-Z0-9_]{4,20})\b",
        r"(?:^|[\s:;,\(\[])#(\d{6,12})\b",
        r"\b((?:PAT|PT|MRN|MED|REC|REEC|ID|ACC|AACC|CAC|CHART|CASE)[:\s]+\d{5,14})\b",
        r"\b((?:MRN|PT|PAT|ID|REC|MED)[\s:-]?(?:19|20)\d{2}[-]?\d{5,10})\b",
        r"\b((?:MRN|MED|ME0|REC|PAT|PT|ID|ACC|ADC)[:\s]+[A-Z0-9!@#$%^&*()_+=\\-]{5,20})\b",
        r"\b((?:MRN|MED|REC|PAT|PT|ID|ACC)[:]{1,2}\s*\d{5,14})\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid MRN pattern"))
        .collect()
});

fn is_tokenized(full_match: &str) -> bool {
    full_match.contains("{{") || full_match.contains("}}")
}

// =============================================================================
// DEA
// =============================================================================

static DEA_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"\bDEA(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2}\d{7})\b",
        r"\b([A-Z]{2}\d{7})\b",
        r"\bDEA(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2}[0-9OoIlBbSs]{7})\b",
        r"\b([A-Z]{2}[0-9OoIlBbSs]{7})\b",
        r"\bDEA\s*[:#-]?\s*([A-Z]{2})[-\s]?([0-9OoIlBbSs]{2})[-\s]?([0-9OoIlBbSs]{5})\b",
        r"\b([A-Z]{2})[-\s]?([0-9OoIlBbSs]{2})[-\s]?([0-9OoIlBbSs]{5})\b",
    ];

    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid DEA pattern"))
        .collect()
});

fn normalize_dea_alnum(dea: &str) -> String {
    dea.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn is_valid_dea(dea: &str) -> bool {
    let normalized = normalize_dea_alnum(dea);
    if normalized.len() != 9 {
        return false;
    }
    let chars: Vec<char> = normalized.chars().collect();
    if !chars[0].is_ascii_alphabetic() || !chars[1].is_ascii_alphabetic() {
        return false;
    }
    let digits: String = chars[2..]
        .iter()
        .map(|c| match *c {
            'O' => '0',
            'I' | 'L' | '|' => '1',
            'B' => '8',
            'S' => '5',
            other => other,
        })
        .collect();
    digits.chars().all(|c| c.is_ascii_digit())
}

// =============================================================================
// CREDIT CARD (pattern + HIPAA-safe Luhn validation)
// =============================================================================

static CREDITCARD_PATTERNS: Lazy<Vec<(Regex, Option<usize>, &'static str)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r"(?i)\b(?:card|cc|credit\s*card)\s*[:#]?\s*([\d\s-]{13,23})\b")
                .expect("invalid CREDITCARD labeled"),
            Some(1),
            "Labeled credit card",
        ),
        (
            Regex::new(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b")
                .expect("invalid CREDITCARD 4x"),
            None,
            "Grouped digits",
        ),
        (
            Regex::new(r"\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\b")
                .expect("invalid CREDITCARD spaced 16"),
            Some(1),
            "Space-separated 16-digit",
        ),
        (
            Regex::new(r"\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{1,4})\b")
                .expect("invalid CREDITCARD spaced varying"),
            Some(1),
            "Space-separated varying groups",
        ),
        (
            Regex::new(r"\b(\d{4}[\s-]+\d{4}[\s-]+\d{4}[\s-]+\d{4})\b")
                .expect("invalid CREDITCARD dash/space 16"),
            Some(1),
            "Dash/space-separated 16-digit",
        ),
        (
            Regex::new(r"\b(\d{4}\s{2,}\d{4}\s{2,}\d{4}\s{2,}\d{4})\b")
                .expect("invalid CREDITCARD ocr spaces"),
            Some(1),
            "OCR extra spaces",
        ),
        (
            Regex::new(r"\b3[47]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3}\b")
                .expect("invalid CREDITCARD amex sep"),
            None,
            "AMEX separated",
        ),
        (
            Regex::new(r"\b3[47]\d{13}\b").expect("invalid CREDITCARD amex compact"),
            None,
            "AMEX compact",
        ),
        (
            Regex::new(r"\b3[47]\d{2}[\s-]\d{6}[\s-]\d{5}\b")
                .expect("invalid CREDITCARD amex group"),
            None,
            "AMEX grouped",
        ),
        (
            Regex::new(r"\b(3[47]\d{2}\s+\d{6}\s+\d{5})\b")
                .expect("invalid CREDITCARD amex spaces"),
            Some(1),
            "AMEX spaced",
        ),
        (
            Regex::new(r"\b(\d{13,19})\b").expect("invalid CREDITCARD continuous"),
            Some(1),
            "Continuous digits",
        ),
    ]
});

fn luhn_ok(digits: &[u32]) -> bool {
    let mut sum: u32 = 0;
    let mut is_even = false;
    for d in digits.iter().rev() {
        let mut digit = *d;
        if is_even {
            digit *= 2;
            if digit > 9 {
                digit -= 9;
            }
        }
        sum += digit;
        is_even = !is_even;
    }
    sum % 10 == 0
}

fn creditcard_digits(s: &str) -> Vec<u32> {
    s.chars().filter_map(|c| c.to_digit(10)).collect()
}

fn is_creditcard_like(card: &str) -> bool {
    let digits = creditcard_digits(card);
    if digits.len() < 13 || digits.len() > 19 {
        return false;
    }

    // HIPAA-sensitivity-first: accept cards that look like cards, even if they fail Luhn.
    let digits_str: String = digits
        .iter()
        .map(|d| char::from_digit(*d, 10).unwrap())
        .collect();
    let is_amex =
        (digits_str.starts_with("34") || digits_str.starts_with("37")) && digits.len() == 15;
    if is_amex {
        return true;
    }

    if luhn_ok(&digits) {
        return true;
    }

    // Common test-card prefixes accepted in TS.
    digits_str.starts_with("4532")
        || digits_str.starts_with("4556")
        || digits_str.starts_with("5425")
        || digits_str.starts_with("2221")
        || digits_str.starts_with("3782")
        || digits_str.starts_with("6011")
}

// =============================================================================
// ACCOUNT NUMBER
// =============================================================================

#[derive(Clone, Copy)]
enum AccountValidator {
    Account,
    AlphanumericAccount,
    AccPrefix,
    Bank,
    Policy,
    Partial,
    Prefixed,
    StandalonePrefixed,
    Group,
    BillingWithYear,
    GenericId,
}

static ACCOUNT_PATTERNS: Lazy<Vec<(Regex, AccountValidator, &'static str, Option<usize>)>> =
    Lazy::new(|| {
        vec![
            (
                Regex::new(r"(?i)\b(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b")
                    .expect("invalid ACCOUNT account"),
                AccountValidator::Account,
                "Account number",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{5,20})\b")
                    .expect("invalid ACCOUNT alphanumeric"),
                AccountValidator::AlphanumericAccount,
                "Account number (alphanumeric)",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(ACC[T]?:\s*\d{6,14})\b").expect("invalid ACCOUNT acc"),
                AccountValidator::AccPrefix,
                "ACC: prefixed account",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Billing|Bill)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b")
                    .expect("invalid ACCOUNT billing"),
                AccountValidator::Account,
                "Billing number",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Hospital|Medical\s+Center)(?:\s+(?:Account|Acct))(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b")
                    .expect("invalid ACCOUNT hospital"),
                AccountValidator::Account,
                "Hospital account",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Bank(?:ing)?|Checking|Savings)\s+(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[:#]?\s*([*\d][-*\d]{3,15})\b")
                    .expect("invalid ACCOUNT bank"),
                AccountValidator::Bank,
                "Bank account",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Insurance\s+)?Policy(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2,4}-\d{4}-\d{4,8}|[A-Z]{3,4}-\d{5,8}|\d{5}-\d{5,8})\b")
                    .expect("invalid ACCOUNT policy"),
                AccountValidator::Policy,
                "Insurance policy",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Account|Card)\s+(?:ending\s+in|last\s+4(?:\s+digits)?)[:\s]+([*\d]{4,6})\b")
                    .expect("invalid ACCOUNT partial"),
                AccountValidator::Partial,
                "Partial account",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Account\s+Number|Patient\s+ID|Member\s+ID|Subscriber\s+ID|Accession\s+(?:Number|No)|Reference\s+(?:Number|No)|Confirmation\s+(?:Number|No)|Document\s+ID)[\s:]+([A-Z]{2,5}-\d{4,12}(?:-\d{4,12})?)\b")
                    .expect("invalid ACCOUNT prefixed"),
                AccountValidator::Prefixed,
                "Prefixed account",
                Some(1),
            ),
            (
                Regex::new(r"\b([A-Z]{2,5}-\d{6,12})\b").expect("invalid ACCOUNT standalone prefixed"),
                AccountValidator::StandalonePrefixed,
                "Standalone prefixed ID",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b(?:Group\s+(?:Number|No|#))[\s:]+([A-Z]{3,5}-[A-Z0-9]{4,12}(?:-\d{4})?)\b")
                    .expect("invalid ACCOUNT group"),
                AccountValidator::Group,
                "Group number",
                Some(1),
            ),
            (
                Regex::new(r"(?i)\b((?:BILL|ACCT|INV|PAY)-\d{4}-\d{6,10})\b")
                    .expect("invalid ACCOUNT billingWithYear"),
                AccountValidator::BillingWithYear,
                "Billing account with year",
                Some(1),
            ),
            (
                Regex::new(r"\b([A-Z]{2,5}-[A-Z]{2,5}-\d{4,6})\b").expect("invalid ACCOUNT genericId"),
                AccountValidator::GenericId,
                "Generic account/transaction ID",
                Some(1),
            ),
        ]
    });

fn is_valid_account(value: &str) -> bool {
    let digits: String = value.chars().filter(|c| c.is_ascii_digit()).collect();
    digits.len() >= 6 && digits.len() <= 15
}

fn is_valid_alphanumeric_account(value: &str) -> bool {
    let cleaned: String = value
        .chars()
        .filter(|c| *c != '-' && *c != ' ' && *c != '.' && *c != '\t')
        .collect();
    cleaned.len() >= 6
        && cleaned.len() <= 20
        && cleaned.chars().any(|c| c.is_ascii_digit())
        && cleaned
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn is_valid_acc_prefix(value: &str) -> bool {
    let upper = value.to_ascii_uppercase();
    let trimmed = upper.trim();
    if !(trimmed.starts_with("ACC:") || trimmed.starts_with("ACCT:")) {
        return false;
    }
    let parts: Vec<&str> = trimmed.split(':').collect();
    if parts.len() < 2 {
        return false;
    }
    let digits: String = parts[1].chars().filter(|c| c.is_ascii_digit()).collect();
    digits.len() >= 6 && digits.len() <= 14
}

fn is_valid_bank_account(value: &str) -> bool {
    let cleaned: String = value.chars().filter(|c| *c != '-' && *c != '*').collect();
    cleaned.len() >= 4 && cleaned.len() <= 17 && cleaned.chars().all(|c| c.is_ascii_digit())
}

fn is_valid_policy(value: &str) -> bool {
    let digits = value.chars().filter(|c| c.is_ascii_digit()).count();
    digits >= 4
        && value.len() >= 8
        && value.len() <= 20
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == ' ')
}

fn is_valid_prefixed_account(value: &str) -> bool {
    if !value.contains('-') {
        return false;
    }
    let parts: Vec<&str> = value.split('-').collect();
    if parts.len() < 2 || parts.len() > 3 {
        return false;
    }
    let prefix = parts[0];
    if prefix.len() < 2 || prefix.len() > 5 || !prefix.chars().all(|c| c.is_ascii_uppercase()) {
        return false;
    }
    for p in parts.iter().skip(1) {
        if p.len() < 4 || p.len() > 12 || !p.chars().all(|c| c.is_ascii_digit()) {
            return false;
        }
    }
    true
}

fn is_valid_standalone_prefixed(value: &str) -> bool {
    let common_prefixes = [
        "ACCT", "PID", "MID", "SID", "REF", "CONF", "TXN", "INV", "ORD", "BILL",
    ];
    let parts: Vec<&str> = value.split('-').collect();
    if parts.len() < 2 {
        return false;
    }
    common_prefixes.contains(&parts[0]) && is_valid_prefixed_account(value)
}

fn is_valid_group_number(value: &str) -> bool {
    if !value.contains('-') {
        return false;
    }
    if value.len() < 8 || value.len() > 25 {
        return false;
    }
    if !value.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return false;
    }
    value.split('-').count() >= 2
}

fn is_valid_billing_with_year(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let prefix = parts[0].to_ascii_uppercase();
    if !["BILL", "ACCT", "INV", "PAY"].contains(&prefix.as_str()) {
        return false;
    }
    let year: i32 = match parts[1].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    if year < 1990 || year > 2100 {
        return false;
    }
    let account_num = parts[2];
    account_num.len() >= 6
        && account_num.len() <= 10
        && account_num.chars().all(|c| c.is_ascii_digit())
}

fn is_valid_generic_id(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let p0 = parts[0];
    let p1 = parts[1];
    let p2 = parts[2];
    (2..=5).contains(&p0.len())
        && p0.chars().all(|c| c.is_ascii_uppercase())
        && (2..=5).contains(&p1.len())
        && p1.chars().all(|c| c.is_ascii_uppercase())
        && (4..=6).contains(&p2.len())
        && p2.chars().all(|c| c.is_ascii_digit())
}

fn validate_account(value: &str, full_match: &str, validator: AccountValidator) -> bool {
    if is_tokenized(full_match) {
        return false;
    }
    match validator {
        AccountValidator::Account => is_valid_account(value),
        AccountValidator::AlphanumericAccount => is_valid_alphanumeric_account(value),
        AccountValidator::AccPrefix => is_valid_acc_prefix(value),
        AccountValidator::Bank => is_valid_bank_account(value),
        AccountValidator::Policy => is_valid_policy(value),
        AccountValidator::Partial => true,
        AccountValidator::Prefixed => is_valid_prefixed_account(value),
        AccountValidator::StandalonePrefixed => is_valid_standalone_prefixed(value),
        AccountValidator::Group => is_valid_group_number(value),
        AccountValidator::BillingWithYear => is_valid_billing_with_year(value),
        AccountValidator::GenericId => is_valid_generic_id(value),
    }
}

// =============================================================================
// LICENSE
// =============================================================================

static LICENSE_PATTERNS: Lazy<Vec<(Regex, Option<usize>, &'static str)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r"(?i)\b(?:DL|Driver'?s?\s+License|Drivers?\s+Lic)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z]{0,2}[A-Z0-9-]{6,20})\b")
                .expect("invalid LICENSE dl"),
            Some(1),
            "Driver's license",
        ),
        (
            Regex::new(r"(?i)\b([A-Z]{2})\s+(?:DL|License|Lic)\s*[#:]?\s*([A-Z0-9-]{6,20})\b")
                .expect("invalid LICENSE state format"),
            Some(2),
            "State license format",
        ),
        (
            Regex::new(r"(?i)\b(?:Medical|Nursing|Professional|RN|MD|NP|PA|DEA)\s+(?:License|Lic|Number|#)\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,19})\b")
                .expect("invalid LICENSE professional"),
            Some(1),
            "Professional license",
        ),
        (
            Regex::new(r"(?i)\b(?:NPI)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9]{10})\b")
                .expect("invalid LICENSE NPI"),
            Some(1),
            "NPI number",
        ),
        (
            Regex::new(r"(?i)\b(?:License|Lic)(?:\s+(?:Number|No))?\s*[#:]\s*([A-Z0-9][A-Z0-9-]{5,19})\b")
                .expect("invalid LICENSE generic"),
            Some(1),
            "Generic license",
        ),
        (
            Regex::new(r"(?i)\bDEA(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*([ABFGMPRX][A-Z][0-9]{7})\b")
                .expect("invalid LICENSE DEA labeled"),
            Some(1),
            "DEA number",
        ),
        (
            Regex::new(r"\b([ABFGMPRX][A-Z][0-9]{7})\b").expect("invalid LICENSE DEA standalone"),
            Some(1),
            "Standalone DEA number",
        ),
        (
            Regex::new(r"(?i)\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD)[-#]?\d{5,10})\b")
                .expect("invalid LICENSE standalone prof"),
            Some(1),
            "Standalone professional license",
        ),
        (
            Regex::new(r"(?i)\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD))(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*(\d{5,10})\b")
                .expect("invalid LICENSE labeled prof"),
            Some(2),
            "Labeled professional license",
        ),
        (
            Regex::new(r"(?i)\b([A-Z]{2}[-](?:RN|LPN|MD|DO|PA|NP|PT|OT)[-]\d{5,10})\b")
                .expect("invalid LICENSE state board"),
            Some(1),
            "State board professional license",
        ),
        (
            Regex::new(r"(?i)\b(?:CLIA)(?:\s+(?:Number|No|#))?\s*[#:]?\s*(\d{2}D\d{7})\b")
                .expect("invalid LICENSE CLIA labeled"),
            Some(1),
            "CLIA number with label",
        ),
        (
            Regex::new(r"\b(\d{2}D\d{7})\b").expect("invalid LICENSE CLIA standalone"),
            Some(1),
            "Standalone CLIA number",
        ),
    ]
});

fn is_valid_license(value: &str) -> bool {
    let cleaned: String = value
        .chars()
        .filter(|c| *c != '-' && !c.is_whitespace() && *c != '.')
        .collect();
    if cleaned.len() < 6 || cleaned.len() > 20 {
        return false;
    }
    if !cleaned.chars().any(|c| c.is_ascii_digit()) {
        return false;
    }
    cleaned.chars().all(|c| c.is_ascii_alphanumeric())
}

// =============================================================================
// HEALTH PLAN
// =============================================================================

static HEALTHPLAN_PATTERNS: Lazy<Vec<(Regex, bool, &'static str)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r"(?i)\b(?:Medicare)(?:\s+(?:Number|No|ID|#))?\s*[#:]?\s*([A-Z0-9]{1}[A-Z0-9-]{9,14})\b")
                .expect("invalid HEALTHPLAN medicare"),
            false,
            "Medicare number",
        ),
        (
            Regex::new(r"(?i)\b(?:Medicaid)(?:\s+(?:Number|No|ID|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{7,19})\b")
                .expect("invalid HEALTHPLAN medicaid"),
            false,
            "Medicaid number",
        ),
        (
            Regex::new(r"(?i)\b(?:Member|Subscriber|Insurance)(?:\s+(?:ID|Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{6,24})\b")
                .expect("invalid HEALTHPLAN member"),
            false,
            "Member/Subscriber ID",
        ),
        (
            Regex::new(r"(?i)\b(?:Policy)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b")
                .expect("invalid HEALTHPLAN policy"),
            false,
            "Policy number",
        ),
        (
            Regex::new(r"(?i)\b(?:Group)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b")
                .expect("invalid HEALTHPLAN group"),
            true,
            "Group number",
        ),
        (
            Regex::new(r"(?i)\b(?:Plan)(?:\s+(?:ID|Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b")
                .expect("invalid HEALTHPLAN plan"),
            true,
            "Plan ID",
        ),
        (
            Regex::new(r"(?i)\b((?:PLAN|GRP|POLICY|POL|PL)-[A-Z0-9-]{4,24})\b")
                .expect("invalid HEALTHPLAN plan group code"),
            false,
            "Plan/Group code (standalone)",
        ),
        (
            Regex::new(r"(?i)\b(?:Policy|POL|POLICY)\s*[#:]?\s*([A-Z0-9]{2,5}-[A-Z0-9-]{3,20})\b")
                .expect("invalid HEALTHPLAN policy code"),
            false,
            "Policy code",
        ),
        (
            Regex::new(r"(?i)\bID\s*[#:]?\s*:?\s*([A-Z]{1,3}[0-9]{5,15})\b")
                .expect("invalid HEALTHPLAN id number"),
            false,
            "Insurance ID number",
        ),
        (
            Regex::new(r"(?i)\bMember\s+ID\s*:\s*([A-Z]{2}-[0-9]{6,12})\b")
                .expect("invalid HEALTHPLAN member prefix"),
            false,
            "Member ID with prefix",
        ),
    ]
});

static INSURANCE_KEYWORDS: [&str; 16] = [
    "insurance",
    "medicare",
    "medicaid",
    "health plan",
    "coverage",
    "benefits",
    "premium",
    "deductible",
    "copay",
    "hmo",
    "ppo",
    "subscriber",
    "beneficiary",
    "covered",
    "carrier",
    "payer",
];

fn has_keyword_context(text: &str, byte_start: usize, byte_len: usize, keywords: &[&str]) -> bool {
    let left = prev_char_boundary(text, byte_start.saturating_sub(100));
    let right = next_char_boundary(text, (byte_start + byte_len + 100).min(text.len()));
    let window = &text[left..right];
    let lower = window.to_ascii_lowercase();
    keywords.iter().any(|k| lower.contains(k))
}

fn validate_healthplan(value: &str) -> bool {
    let cleaned: String = value
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-' && *c != '.')
        .collect();
    cleaned.len() >= 7
        && cleaned.len() <= 20
        && cleaned.chars().any(|c| c.is_ascii_digit())
        && cleaned.chars().all(|c| c.is_ascii_alphanumeric())
}

// =============================================================================
// PASSPORT
// =============================================================================

static PASSPORT_KEYWORDS: [&str; 7] = [
    "passport",
    "travel document",
    "document number",
    "passport no",
    "passport #",
    "passport number",
    "passport num",
];

static PASSPORT_PATTERNS: Lazy<Vec<(Regex, bool, &'static str, f64)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(
                r"(?i)\b(?:passport|travel\s*document)(?:\s*(?:no|#|number|num))?[\s:]+([A-Z]{1,2}\d{6,8}|\d{9}|[A-Z0-9]{9})\b",
            )
            .expect("invalid PASSPORT contextual"),
            false,
            "Contextual passport",
            0.95,
        ),
        (
            Regex::new(r"\b([A-Z]{1,2}\d{6,8})\b").expect("invalid PASSPORT canada"),
            true,
            "Canadian passport",
            0.88,
        ),
        (
            Regex::new(r"\b([A-Z]\d{8}|\d{9})\b").expect("invalid PASSPORT us"),
            true,
            "US passport",
            0.85,
        ),
        (
            Regex::new(r"\b([A-Z]{2}\d{7}|[A-Z]\d{8})\b").expect("invalid PASSPORT uk/eu"),
            true,
            "UK/EU passport",
            0.87,
        ),
    ]
});

fn passport_looks_like_other_identifier(text: &str, byte_start: usize, value: &str) -> bool {
    let left = prev_char_boundary(text, byte_start.saturating_sub(50));
    let right = next_char_boundary(text, (byte_start + value.len() + 50).min(text.len()));
    let window = &text[left..right];
    let lower = window.to_ascii_lowercase();

    let ssn_keywords = ["ssn", "social security", "ss#", "ss #"];
    if ssn_keywords.iter().any(|k| lower.contains(k)) {
        return true;
    }

    let phone_keywords = ["phone", "tel", "fax", "cell", "mobile", "call"];
    if phone_keywords.iter().any(|k| lower.contains(k)) {
        return true;
    }

    Regex::new(r"\d{3}-\d{2}-\d{4}")
        .expect("invalid ssn-context regex")
        .is_match(&lower)
}

// =============================================================================
// DATE
// =============================================================================

static DATE_PATTERNS: Lazy<Vec<(Regex, Option<usize>, &'static str, f64)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r"(?i)\b(?:dob|d\.o\.b\.|date\s+of\s+birth)[:\s#-]*((?:0?[1-9]|1[0-2])[\s./-](?:0?[1-9]|[12]\d|3[01])[\s./-](?:\d{2}|(?:19|20)\d{2}))\b")
                .expect("invalid DATE dob"),
            Some(1),
            "DOB",
            0.97,
        ),
        (
            Regex::new(r"\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b")
                .expect("invalid DATE us long"),
            None,
            "US numeric date",
            0.95,
        ),
        (
            Regex::new(r"\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/]\d{2}\b")
                .expect("invalid DATE us short"),
            None,
            "US numeric short year",
            0.92,
        ),
        (
            Regex::new(r"\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b")
                .expect("invalid DATE iso"),
            None,
            "ISO date",
            0.95,
        ),
        (
            Regex::new(r"(?i)\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(19|20)\d{2}\b")
                .expect("invalid DATE monthname mdy"),
            None,
            "Month name (MDY)",
            0.95,
        ),
        (
            Regex::new(r"(?i)\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(19|20)\d{2}\b")
                .expect("invalid DATE monthname dmy"),
            None,
            "Month name (DMY)",
            0.95,
        ),
        (
            Regex::new(r"(?i)\b([0-2]?[0-9]|3[01])(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(19|20)\d{2}\b")
                .expect("invalid DATE military"),
            None,
            "Military date",
            0.92,
        ),
        (
            Regex::new(r"(?i)\b([0-2]?[0-9]|3[01])[-\\s](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\\s](19|20)\d{2}\b")
                .expect("invalid DATE military sep"),
            None,
            "Military date (sep)",
            0.92,
        ),
        (
            Regex::new(r"(?i)\b(?:born|admitted|discharged|diagnosed|since|in|year)\s+((?:19|20)\d{2})\b")
                .expect("invalid DATE contextual year"),
            Some(1),
            "Contextual year",
            0.85,
        ),
        (
            Regex::new(r"\b\d{1,4}[-/]\d{1,4}[-/]\d{1,4}\b").expect("invalid DATE generic"),
            None,
            "Generic numeric date",
            0.8,
        ),
    ]
});

// =============================================================================
// ADDRESS / GEOGRAPHY (street + highways + contextual city mentions)
// =============================================================================

static ADDRESS_PATTERNS: Lazy<Vec<(Regex, Option<usize>, &'static str, f64)>> = Lazy::new(|| {
    let street_suffixes = [
        "street",
        "st",
        "avenue",
        "ave",
        "road",
        "rd",
        "drive",
        "dr",
        "boulevard",
        "blvd",
        "lane",
        "ln",
        "way",
        "court",
        "ct",
        "circle",
        "cir",
        "place",
        "pl",
        "terrace",
        "ter",
        "parkway",
        "pkwy",
        "highway",
        "hwy",
        "trail",
        "path",
        "alley",
        "plaza",
        "close",
        "crescent",
        "cres",
        "gardens",
        "gdns",
        "grove",
        "gr",
        "mews",
        "rise",
        "row",
        "square",
        "sq",
        "walk",
        "parade",
        "pde",
        "esplanade",
        "esp",
        "promenade",
    ];
    let suffix_pattern = street_suffixes.join("|");

    let us_states = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
        "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
        "VA", "WA", "WV", "WI", "WY", "DC",
    ];
    let us_state_pattern = us_states.join("|");

    let ca_provinces = [
        "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
    ];
    let ca_province_pattern = ca_provinces.join("|");

    let au_states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
    let au_state_pattern = au_states.join("|");

    vec![
        (
            Regex::new(r"(?i)\b(?:P\.?O\.?\s*Box|POB)\s+\d+\b").expect("invalid ADDRESS POBOX"),
            None,
            "PO Box",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+\s+[A-Z][a-z']+(?:\s+[A-Z][a-z']+)*\s+(?:{})(?:\s*,?\s*(?:Apt|Suite|Unit|#|Ste|Bldg|Building|Floor|Fl)?\s*[A-Z0-9]+)?\b",
                suffix_pattern
            ))
            .expect("invalid ADDRESS street"),
            None,
            "Street address",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)(?:Home\s+)?Address:\s*(\d+\s+[A-Z][a-z']+(?:\s+[A-Z][a-z']+)*\s+(?:{}))",
                suffix_pattern
            ))
            .expect("invalid ADDRESS labeled"),
            Some(1),
            "Address with prefix",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:{})\s+\d{{5}}(?:-\d{{4}})?\b",
                us_state_pattern
            ))
            .expect("invalid ADDRESS city state zip"),
            None,
            "City, State ZIP",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{})\s*[\r\n]+\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:{})\s+\d{{5}}(?:-\d{{4}})?\b",
                suffix_pattern, us_state_pattern
            ))
            .expect("invalid ADDRESS multiline us"),
            None,
            "Multi-line US address",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{}),\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:{})\s+\d{{5}}(?:-\d{{4}})?\b",
                suffix_pattern, us_state_pattern
            ))
            .expect("invalid ADDRESS full us"),
            None,
            "Full US address",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:{})\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d\b",
                ca_province_pattern
            ))
            .expect("invalid ADDRESS ca city province"),
            None,
            "Canadian city/province/postal",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{}),\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:{})\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d\b",
                suffix_pattern, ca_province_pattern
            ))
            .expect("invalid ADDRESS full ca"),
            None,
            "Full Canadian address",
            0.85,
        ),
        (
            Regex::new(r"\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b").expect("invalid ADDRESS ca postal standalone"),
            None,
            "Canadian postal code",
            0.85,
        ),
        (
            Regex::new(r"(?i)\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b")
                .expect("invalid ADDRESS uk postcode"),
            None,
            "UK postcode",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+[A-Za-z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{})(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*,?\s+[A-Z]{{1,2}}\d[A-Z\d]?\s*\d[A-Z]{{2}}\b",
                suffix_pattern
            ))
            .expect("invalid ADDRESS uk full"),
            None,
            "UK address with postcode",
            0.85,
        ),
        (
            Regex::new(r"(?i)\b[A-Z][a-z]+\s+(?:Cottage|House|Lodge|Manor|Farm),?\s*\d*\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Crescent)\b")
                .expect("invalid ADDRESS uk named house"),
            None,
            "UK named house",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{}),\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:{})\s+\d{{4}}\b",
                suffix_pattern, au_state_pattern
            ))
            .expect("invalid ADDRESS au full"),
            None,
            "Australian address",
            0.85,
        ),
        (
            Regex::new(&format!(
                r"(?i)\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+(?:{})\s+\d{{4}}\b",
                au_state_pattern
            ))
            .expect("invalid ADDRESS au city state"),
            None,
            "Australian city/state/postcode",
            0.85,
        ),
    ]
});

static ADDRESS_HIGHWAY_PATTERNS: Lazy<Vec<(Regex, &'static str, f64)>> = Lazy::new(|| {
    vec![
        (
            Regex::new(r"(?i)\b(?:Highway|Hwy|US[-\s]?)\s*\d{1,3}[A-Z]?\b")
                .expect("invalid ADDRESS highway us"),
            "Highway/Road reference",
            0.9,
        ),
        (
            Regex::new(r"(?i)\b(?:Interstate|I[-\s]?)\s*\d{1,3}\b")
                .expect("invalid ADDRESS interstate"),
            "Highway/Road reference",
            0.9,
        ),
        (
            Regex::new(r"(?i)\b(?:State\s+)?(?:Route|SR)[-\s]?\d{1,4}\b")
                .expect("invalid ADDRESS state route"),
            "Highway/Road reference",
            0.9,
        ),
        (
            Regex::new(r"(?i)\b(?:County\s+Road|CR)[-\s]?\d{1,4}\b")
                .expect("invalid ADDRESS county road"),
            "Highway/Road reference",
            0.9,
        ),
        (
            Regex::new(r"(?i)\b(?:FM|RM)[-\s]?\d{1,4}\b").expect("invalid ADDRESS fm rm"),
            "Highway/Road reference",
            0.9,
        ),
    ]
});

static ADDRESS_CONTEXTUAL_CITY_RE: Lazy<Regex> = Lazy::new(|| {
    let context_words = [
        "near",
        "in",
        "at",
        "from",
        "to",
        "around",
        "outside",
        "downtown",
        "north",
        "south",
        "east",
        "west",
        "suburb",
        "city",
        "town",
        "area",
        "region",
        "resident",
        "lives",
        "living",
        "moved",
        "relocated",
    ];
    let ctx = context_words.join("|");
    Regex::new(&format!(
        r"(?:(?i)\b({})\b)\s+([A-Z][a-z]{{2,}}(?:\s+[A-Z][a-z]+)?)\b",
        ctx
    ))
    .expect("invalid ADDRESS contextual city")
});

static ADDRESS_FACILITY_CITY_RE: Lazy<Regex> = Lazy::new(|| {
    let suffixes = [
        "Living",
        "Center",
        "Hospital",
        "Clinic",
        "Medical",
        "Health",
        "Care",
        "Rehabilitation",
        "Nursing",
        "Assisted",
        "Memory",
        "Hospice",
        "Facility",
        "Institute",
        "Associates",
    ];
    let suf = suffixes.join("|");
    Regex::new(&format!(
        r"\b(?:[A-Z][a-z]+\s+)*(?:{}),\s*([A-Z][a-z]+)\b",
        suf
    ))
    .expect("invalid ADDRESS facility city")
});

fn address_city_looks_like_person(text: &str, city: &str, city_start: usize) -> bool {
    let name_suffixes = ["jr", "sr", "ii", "iii", "md", "phd", "rn"];
    let city_start = prev_char_boundary(text, city_start);
    let after_start = next_char_boundary(text, city_start + city.len());
    let after_end = next_char_boundary(text, (after_start + 10).min(text.len()));
    let after = &text[after_start..after_end]
        .trim_start()
        .to_ascii_lowercase();
    if name_suffixes.iter().any(|s| after.starts_with(s)) {
        return true;
    }

    let before_start = prev_char_boundary(text, city_start.saturating_sub(10));
    let before = &text[before_start..city_start].to_ascii_lowercase();
    Regex::new(r"(?i)\b(?:dr|mr|mrs|ms|miss)\.?\s*$")
        .expect("invalid person prefix regex")
        .is_match(before)
}

// =============================================================================
// VEHICLE (VIN / plates / GPS / IPv6 / workstation IDs)
// =============================================================================

static VIN_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:VIN|Vehicle\s+Identification\s+Number|Vehicle\s+ID)[\s:#]*([A-HJ-NPR-Z0-9]{17})\b")
        .expect("invalid VIN_LABELED_RE")
});

static VIN_STANDALONE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b([A-HJ-NPR-Z0-9]{17})\b").expect("invalid VIN_STANDALONE_RE"));

static PLATE_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:license\s+plate|plate\s+number|registration|plate)[\s:#]*([A-Z]{2}[-\s]?[A-Z0-9]{5,7}|[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,4})\b")
        .expect("invalid PLATE_LABELED_RE")
});

static PLATE_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    let sources: Vec<&str> = vec![
        r"\b([A-Z]{2}[-\s][A-Z0-9]{5,7})\b",
        r"\b([A-Z]{2,3}[-\s][0-9]{3,4})\b",
        r"\b([0-9][A-Z]{2,3}[0-9]{3,4})\b",
        r"\b([A-Z]{4}[0-9]{2})\b",
        r"\b([A-Z]{3}[0-9]{3})\b",
        r"\b([A-Z]{2}[0-9]{4})\b",
        r"\b([A-Z]{1,2}[0-9]{2}\s+[A-Z]{3})\b",
        r"\b([0-9]{3}\s+[A-Z]{3})\b",
        r"\b([A-Z]{2,4}[0-9]{2,4})\b",
        r"\b([0-9]{2,4}[A-Z]{2,4})\b",
        r"\b([A-Z0-9]{2,4}[\u2013\-][A-Z0-9]{2,4})\b",
        r"\b([A-Z0-9]{1,3}[.\u2013\-\s][A-Z0-9]{1,3}[.\u2013\-\s][A-Z0-9]{1,4})\b",
    ];
    sources
        .into_iter()
        .map(|s| Regex::new(&format!("(?i){}", s)).expect("invalid PLATE pattern"))
        .collect()
});

static GPS_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(-?\d{1,3}\.\d{4,10})\s*°?\s*[NS]?,?\s*(-?\d{1,3}\.\d{4,10})\s*°?\s*[EW]?\b")
        .expect("invalid GPS_RE")
});

static IPV6_FULL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})\b").expect("invalid IPV6_FULL_RE")
});

static IPV6_COMPRESSED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b((?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))\b")
        .expect("invalid IPV6_COMPRESSED_RE")
});

static WORKSTATION_EXPLICIT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Z]{2,8}-[A-Z]{2,8}-(?:STATION|TERMINAL|WS|WORKSTATION|COMPUTER)-[A-Z0-9]{1,4})\b")
        .expect("invalid WORKSTATION_EXPLICIT_RE")
});

static WORKSTATION_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Workstation|Terminal|Station|Computer)\s+(?:ID|Number|#)[\s:#]*([A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,})\b")
        .expect("invalid WORKSTATION_LABELED_RE")
});

fn is_valid_vin(vin: &str) -> bool {
    let cleaned: String = vin.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.len() != 17 {
        return false;
    }
    if !cleaned
        .chars()
        .all(|c| c.is_ascii_digit() || (c.is_ascii_uppercase() && c != 'I' && c != 'O' && c != 'Q'))
    {
        return false;
    }
    if !cleaned.chars().any(|c| c.is_ascii_digit()) {
        return false;
    }
    let first = cleaned.chars().next().unwrap_or(' ');
    if cleaned.chars().all(|c| c == first) {
        return false;
    }
    true
}

fn is_valid_license_plate(plate: &str) -> bool {
    let cleaned: String = plate
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_uppercase();
    if cleaned.len() < 4 || cleaned.len() > 8 {
        return false;
    }
    cleaned.chars().any(|c| c.is_ascii_digit()) && cleaned.chars().any(|c| c.is_ascii_alphabetic())
}

fn is_vital_sign_context(text: &str, byte_start: usize, matched: &str) -> bool {
    let prefix_start = prev_char_boundary(text, byte_start.saturating_sub(20));
    let byte_start = prev_char_boundary(text, byte_start);
    let prefix = &text[prefix_start..byte_start];
    let prefix_lower = prefix.to_ascii_lowercase();
    if Regex::new(r"(?i)\b(bp|hr|rr|pr|temp|spo2|o2|sat|sbp|dbp|map)\s*$")
        .expect("invalid vital prefix regex")
        .is_match(&prefix_lower)
    {
        return true;
    }

    let surround_start = prev_char_boundary(text, byte_start.saturating_sub(50));
    let surround_end = next_char_boundary(text, (byte_start + matched.len() + 20).min(text.len()));
    let surround = &text[surround_start..surround_end].to_ascii_lowercase();
    ["mmhg", "bpm", "blood pressure", "heart rate", "vital signs"]
        .iter()
        .any(|k| surround.contains(k))
}

fn is_valid_gps(lat: &str, lon: &str) -> bool {
    let lat: f64 = match lat.parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let lon: f64 = match lon.parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    lat >= -90.0 && lat <= 90.0 && lon >= -180.0 && lon <= 180.0
}

fn is_valid_ipv6(ip: &str) -> bool {
    let s = ip.trim();
    if !s.contains(':') {
        return false;
    }
    if s.matches("::").count() > 1 {
        return false;
    }
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() > 8 {
        return false;
    }
    for p in parts {
        if p.is_empty() {
            continue;
        }
        if p.len() > 4 {
            return false;
        }
        if !p.chars().all(|c| c.is_ascii_hexdigit()) {
            return false;
        }
    }
    true
}

// =============================================================================
// DEVICE (medical device identifiers; context-aware)
// =============================================================================

static DEVICE_KEYWORDS: [&str; 12] = [
    "pacemaker",
    "defibrillator",
    "icd",
    "aicd",
    "crt",
    "implant",
    "device",
    "stent",
    "catheter",
    "pump",
    "stimulator",
    "valve",
];

static DEVICE_WITH_SERIAL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Pacemaker|Defibrillator|ICD|AICD|CRT|Implant|Device|Prosth|Stent|Catheter|Pump|Stimulator|Valve|Graft)\s+(?:Serial|SN|ID|Number|Model)\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{6,24})\b")
        .expect("invalid DEVICE_WITH_SERIAL_RE")
});

static DEVICE_MODEL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Model)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{6,24})\b")
        .expect("invalid DEVICE_MODEL_RE")
});

static DEVICE_SERIAL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Serial|SN)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{6,24})\b")
        .expect("invalid DEVICE_SERIAL_RE")
});

static DEVICE_SHORT_SERIAL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:Serial|SN)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9]{4,6})\b")
        .expect("invalid DEVICE_SHORT_SERIAL_RE")
});

static DEVICE_IMPLANT_DATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Z]{2,4}-\d{4}-[A-Z0-9-]{6,18})\b")
        .expect("invalid DEVICE_IMPLANT_DATE_RE")
});

static DEVICE_MANUFACTURER_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b((?:ABBOTT|STRYKER|MEDTRONIC|BOSTON|ZIMMER|BIOMET|DEPUY|SYNTHES|SMITH|NEPHEW|JOHNSON|ETHICON|COVIDIEN|BAXTER|BECTON|DICKINSON|PHILIPS|SIEMENS|GE|BIOTRONIK|SORIN|LIVANOVA|SPECTRANETICS|NEVRO|AXONICS|INSPIRE|RESMED|INTUITIVE)(?:-[A-Z0-9]+){1,3})\b")
        .expect("invalid DEVICE_MANUFACTURER_RE")
});

static DEVICE_PREFIX_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b((?:BS|TAN|PM|ICD|CRT|IPG|INS|CGM|VAD|LVAD|SCS|DBS|VNS|SNS|MDT|SJM|BIO|ELA|DEV|SER|MOD|REF|LOT|UDI)-[A-Z0-9]{5,})\b")
        .expect("invalid DEVICE_PREFIX_RE")
});

fn is_valid_device_identifier(identifier: &str) -> bool {
    let known_non_phi = ["8849-221-00"];
    if known_non_phi.contains(&identifier) {
        return false;
    }
    let cleaned: String = identifier.chars().filter(|c| *c != '-').collect();
    if cleaned.len() < 7 || cleaned.len() > 25 {
        return false;
    }
    if !cleaned.chars().any(|c| c.is_ascii_digit()) {
        return false;
    }
    cleaned.chars().all(|c| c.is_ascii_alphanumeric())
}

// =============================================================================
// UNIQUE IDENTIFIERS (loyalty / membership / badge IDs)
// =============================================================================

static UNIQUE_BRAND_RE: Lazy<Regex> = Lazy::new(|| {
    // A compact subset of common brand prefixes; expand via TS if needed.
    Regex::new(r"(?i)\b((?:PLANETFIT|PLANET|ANYTIME|LAFITNESS|GOLDSGYM|GOLDS|YMCA|EQUINOX|ORANGETHEORY|CROSSFIT|LIFETIME|CRUNCH|SNAP|DELTA|UNITED|AMERICAN|SOUTHWEST|JETBLUE|ALASKA|SKYMILES|MILEAGEPLUS|AADVANTAGE|RAPIDREWARDS|TRUEBLUE|MARRIOTT|HILTON|HYATT|IHG|WYNDHAM|BONVOY|HONORS|TARGET|WALMART|COSTCO|AMAZON|PRIME|KROGER|CVS|WALGREENS|STARBUCKS|HERTZ|ENTERPRISE|NATIONAL|AVIS|BUDGET|CHASE|AMEX|CITI|DISCOVER|CAPITALONE|WELLSFARGO)(?:-[A-Z0-9]+){1,3})\b")
        .expect("invalid UNIQUE_BRAND_RE")
});

static UNIQUE_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:member(?:ship)?|loyalty|rewards?|subscriber|customer|client|patron|frequent\s*(?:flyer|traveler)?)\s*(?:id|identifier|number|#|no\.?|code)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,})\b")
        .expect("invalid UNIQUE_LABELED_RE")
});

static UNIQUE_CONTEXT_ID_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Z]{2,}[\-#][A-Z0-9]{5,})\b").expect("invalid UNIQUE_CONTEXT_ID_RE")
});

static UNIQUE_TRAVELER_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:frequent\s*(?:flyer|traveler)|ff|mileage(?:plus)?|skymiles|aadvantage|rapid\s*rewards|true\s*blue)\s*(?:#|number|no\.?|id)?\s*[:\-]?\s*([A-Z0-9]{6,12})\b")
        .expect("invalid UNIQUE_TRAVELER_RE")
});

static UNIQUE_BADGE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:badge|access|employee|staff|visitor|contractor)\s*(?:id|identifier|number|#|no\.?|code|card)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,})\b")
        .expect("invalid UNIQUE_BADGE_RE")
});

static UNIQUE_CONTEXT_KEYWORDS: [&str; 12] = [
    "member",
    "membership",
    "loyalty",
    "rewards",
    "points",
    "frequent",
    "flyer",
    "traveler",
    "subscriber",
    "customer",
    "badge",
    "access",
];

// =============================================================================
// AGE 90+ (HIPAA Safe Harbor requires aggregation of ages 90+)
// =============================================================================

// Pattern: "92 years old", "91 y/o", "94 yo", "aged 96"
static AGE_EXPLICIT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(9\d|1[0-2]\d)\s*(?:years?\s+old|y\.?o\.?|yr\.?s?\s+old|years?\s+of\s+age)\b",
    )
    .expect("invalid AGE_EXPLICIT_RE")
});

// Pattern: "age 95", "aged 91"
static AGE_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:age|aged)\s*[:#]?\s*(9\d|1[0-2]\d)\b").expect("invalid AGE_LABELED_RE")
});

// Pattern: "Age: 92", "Patient Age: 94"
static AGE_FIELD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:patient\s+)?age\s*[:\-=]\s*(9\d|1[0-2]\d)(?:\s*(?:years?\s*(?:old)?|y\.?o\.?|yo))?\b")
        .expect("invalid AGE_FIELD_RE")
});

// Pattern: "93-year-old"
static AGE_COMPOUND_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(9\d|1[0-2]\d)[-–]year[-–]old\b").expect("invalid AGE_COMPOUND_RE")
});

// Pattern: "in her 90s", "early 90s", "late 90s"
static AGE_ORDINAL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(?:in\s+)?(?:his|her|their|the)\s+(?:early\s+|mid[- ]?|late\s+)?(90|100|110)s\b",
    )
    .expect("invalid AGE_ORDINAL_RE")
});

// Pattern: "92 M", "98 F" (demographic)
static AGE_DEMOGRAPHIC_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b(9\d|1[0-2]\d)\s*([MF]|Male|Female)\b").expect("invalid AGE_DEMOGRAPHIC_RE")
});

// Pattern: age ranges "90-95 years", "92-98"
static AGE_RANGE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(9\d|1[0-2]\d)\s*[-–—to]+\s*(\d{2,3})\s*(?:years?\s+old|years?|y\.?o\.?)?\b")
        .expect("invalid AGE_RANGE_RE")
});

fn is_age_90_plus(age_str: &str) -> bool {
    if let Ok(age) = age_str.parse::<u32>() {
        age >= 90 && age <= 125
    } else {
        false
    }
}

// =============================================================================
// BIOMETRIC IDENTIFIERS (contextual detection)
// =============================================================================

// Pattern: labeled biometric data
static BIOMETRIC_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:fingerprint|retina|iris|voiceprint|facial\s*recognition|biometric)\s*(?:id|identifier|data|scan|template|hash|record|sample)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-_]{5,})\b")
        .expect("invalid BIOMETRIC_LABELED_RE")
});

// Pattern: DNA/genetic identifiers
static BIOMETRIC_DNA_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:dna|genetic|genome|genotype)\s*(?:id|identifier|profile|sample|marker|sequence)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-_]{5,})\b")
        .expect("invalid BIOMETRIC_DNA_RE")
});

// Pattern: face/photo ID references
static BIOMETRIC_FACE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:face|facial|photo)\s*(?:id|identifier|recognition|template|encoding|vector)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-_]{5,})\b")
        .expect("invalid BIOMETRIC_FACE_RE")
});

// =============================================================================
// RELATIVE DATES (temporal expressions that may identify individuals)
// =============================================================================

// Pattern: "last Tuesday", "next Monday", etc.
static RELATIVE_DAY_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:last|next|this|past|previous|coming|upcoming)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b")
        .expect("invalid RELATIVE_DAY_RE")
});

// Pattern: "2 days ago", "3 weeks ago", "in 5 days"
static RELATIVE_AGO_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:(\d+)\s+(?:days?|weeks?|months?|years?)\s+ago|in\s+(\d+)\s+(?:days?|weeks?|months?|years?))\b")
        .expect("invalid RELATIVE_AGO_RE")
});

// Pattern: "yesterday", "today", "tomorrow"
static RELATIVE_KEYWORD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(?:yesterday|today|tomorrow|day\s+before\s+yesterday|day\s+after\s+tomorrow)\b",
    )
    .expect("invalid RELATIVE_KEYWORD_RE")
});

// Pattern: "last week", "next month", "this year"
static RELATIVE_PERIOD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(?:last|next|this|past|previous|coming)\s+(?:week|month|year|quarter|semester)\b",
    )
    .expect("invalid RELATIVE_PERIOD_RE")
});

// Pattern: "earlier today", "later this week"
static RELATIVE_CONTEXT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:earlier|later)\s+(?:today|this\s+(?:week|month|year))\b")
        .expect("invalid RELATIVE_CONTEXT_RE")
});

// =============================================================================
// HOSPITAL / HEALTHCARE FACILITY NAMES
// =============================================================================

// Common hospital name patterns
static HOSPITAL_PATTERN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+(?:Hospital|Medical\s+Center|Health\s+Center|Healthcare|Clinic|Memorial|Regional|General|Community|University|Children'?s|Veterans|VA)\b")
        .expect("invalid HOSPITAL_PATTERN_RE")
});

// Pattern: "St. Mary's Hospital", "Mount Sinai"
static HOSPITAL_SAINT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:St\.?|Saint|Mount|Mt\.?)\s+[A-Z][A-Za-z]+(?:'s)?\s*(?:Hospital|Medical\s+Center|Health|Clinic|Memorial|Regional)?\b")
        .expect("invalid HOSPITAL_SAINT_RE")
});

// Pattern: labeled hospital references
static HOSPITAL_LABELED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(?:hospital|facility|institution|center|clinic)\s*[:#]\s*([A-Z][A-Za-z\s]+(?:Hospital|Medical|Health|Clinic|Memorial|Center))\b")
        .expect("invalid HOSPITAL_LABELED_RE")
});

// =============================================================================
// MAIN ENTRYPOINT
// =============================================================================

#[napi]
pub fn scan_all_identifiers(text: String) -> Vec<IdentifierDetection> {
    if text.is_empty() {
        return vec![];
    }

    let map = build_utf16_index_map(&text);
    let mut out: Vec<IdentifierDetection> = Vec::new();

    // EMAIL
    for m in EMAIL_RE.find_iter(&text) {
        out.push(IdentifierDetection {
            filter_type: "EMAIL".to_string(),
            character_start: byte_to_utf16(&map, m.start()),
            character_end: byte_to_utf16(&map, m.end()),
            text: m.as_str().to_string(),
            confidence: 0.95,
            pattern: "Rust Email".to_string(),
        });
    }

    // IP
    for m in IPV4_RE.find_iter(&text) {
        let ip = m.as_str();
        if !is_valid_ipv4(ip) {
            continue;
        }
        out.push(IdentifierDetection {
            filter_type: "IP".to_string(),
            character_start: byte_to_utf16(&map, m.start()),
            character_end: byte_to_utf16(&map, m.end()),
            text: ip.to_string(),
            confidence: 0.95,
            pattern: "Rust IPv4".to_string(),
        });
    }

    // URL (dedupe and avoid overlaps, similar to TS)
    let mut seen_ranges: Vec<(u32, u32)> = Vec::new();
    for (re, name, conf) in URL_PATTERNS.iter() {
        for m in re.find_iter(&text) {
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());

            let mut overlaps_any = false;
            for (s, e) in seen_ranges.iter() {
                if overlaps(start, end, *s, *e) {
                    overlaps_any = true;
                    break;
                }
            }
            if overlaps_any {
                continue;
            }
            seen_ranges.push((start, end));
            out.push(IdentifierDetection {
                filter_type: "URL".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: *conf,
                pattern: name.to_string(),
            });
        }
    }

    // PHONE (two passes: raw + OCR-normalized)
    let mut phone_seen: HashSet<u64> = HashSet::new();
    for source in [&text, &normalize_ocr_text(&text)] {
        let source_map = build_utf16_index_map(source);
        for re in PHONE_PATTERNS.iter() {
            for m in re.find_iter(source) {
                let phone = m.as_str();
                let start = byte_to_utf16(&source_map, m.start());
                let end = byte_to_utf16(&source_map, m.end());
                let key = ((start as u64) << 32) | (end as u64);
                if phone_seen.contains(&key) {
                    continue;
                }

                // Skip if preceding label indicates this is an NPI
                if is_npi_label_before(source, m.start()) {
                    continue;
                }

                // Minimum digit/alnum count checks (matches TS behavior)
                let digit_count = phone.chars().filter(|c| c.is_ascii_digit()).count();
                let letter_count = phone.chars().filter(|c| c.is_ascii_alphabetic()).count();
                let total = digit_count + letter_count;
                if letter_count > 0 {
                    if total < 10 {
                        continue;
                    }
                } else if digit_count < 7 {
                    continue;
                }

                phone_seen.insert(key);
                out.push(IdentifierDetection {
                    filter_type: "PHONE".to_string(),
                    character_start: start,
                    character_end: end,
                    text: phone.to_string(),
                    confidence: phone_confidence(phone),
                    pattern: "Rust Phone".to_string(),
                });
            }
        }
    }

    // SSN (two passes: raw + OCR-normalized)
    let mut ssn_seen: HashSet<u64> = HashSet::new();
    for source in [&text, &normalize_ocr_text(&text)] {
        let source_map = build_utf16_index_map(source);
        for re in SSN_PATTERNS.iter() {
            for m in re.find_iter(source) {
                let ssn = m.as_str();
                let start = byte_to_utf16(&source_map, m.start());
                let end = byte_to_utf16(&source_map, m.end());
                let key = ((start as u64) << 32) | (end as u64);
                if ssn_seen.contains(&key) {
                    continue;
                }
                if !is_valid_ssn(ssn) {
                    continue;
                }
                ssn_seen.insert(key);
                out.push(IdentifierDetection {
                    filter_type: "SSN".to_string(),
                    character_start: start,
                    character_end: end,
                    text: ssn.to_string(),
                    confidence: 0.95,
                    pattern: "Rust SSN".to_string(),
                });
            }
        }
    }

    // NPI (labeled)
    for caps in NPI_RE.captures_iter(&text) {
        if let Some(m) = caps.get(1) {
            out.push(IdentifierDetection {
                filter_type: "NPI".to_string(),
                character_start: byte_to_utf16(&map, m.start()),
                character_end: byte_to_utf16(&map, m.end()),
                text: m.as_str().to_string(),
                confidence: 0.95,
                pattern: "Rust NPI".to_string(),
            });
        }
    }

    // ZIPCODE (dedupe)
    let mut zip_seen: HashSet<u64> = HashSet::new();
    for re in ZIP_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let whole = caps.get(0).expect("ZIP match missing group 0");
            let m = caps.get(1).unwrap_or(whole);
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if zip_seen.contains(&key) {
                continue;
            }
            zip_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "ZIPCODE".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.85,
                pattern: "Rust ZIP".to_string(),
            });
        }
    }

    // FAX (explicit label + validation)
    let mut fax_seen: HashSet<u64> = HashSet::new();
    for re in FAX_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("FAX match missing group 0");
            if !full.as_str().to_ascii_lowercase().contains("fax") {
                continue;
            }
            let m = match caps.get(1) {
                Some(v) => v,
                None => continue,
            };
            if !is_valid_us_phone_like(m.as_str()) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if fax_seen.contains(&key) {
                continue;
            }
            fax_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "FAX".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.95,
                pattern: "Rust Fax".to_string(),
            });
        }
    }

    // MRN
    let mut mrn_seen: HashSet<u64> = HashSet::new();
    for re in MRN_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("MRN match missing group 0");
            let m = match caps.get(1) {
                Some(v) => v,
                None => full,
            };
            if is_tokenized(full.as_str()) {
                continue;
            }
            if !m.as_str().chars().any(|c| c.is_ascii_digit()) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if mrn_seen.contains(&key) {
                continue;
            }
            mrn_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "MRN".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.9,
                pattern: "Rust MRN".to_string(),
            });
        }
    }

    // DEA
    let mut dea_seen: HashSet<u64> = HashSet::new();
    for re in DEA_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("DEA match missing group 0");

            let (start_byte, end_byte) = if let (Some(g1), Some(g3)) = (caps.get(1), caps.get(3)) {
                (g1.start(), g3.end())
            } else if let Some(g1) = caps.get(1) {
                (g1.start(), g1.end())
            } else {
                (full.start(), full.end())
            };

            let slice = &text[start_byte..end_byte];
            if !is_valid_dea(slice) {
                continue;
            }

            let start = byte_to_utf16(&map, start_byte);
            let end = byte_to_utf16(&map, end_byte);
            let key = ((start as u64) << 32) | (end as u64);
            if dea_seen.contains(&key) {
                continue;
            }
            dea_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "DEA".to_string(),
                character_start: start,
                character_end: end,
                text: slice.to_string(),
                confidence: 0.95,
                pattern: "Rust DEA".to_string(),
            });
        }
    }

    // CREDITCARD
    let mut cc_seen: HashSet<u64> = HashSet::new();
    for (re, capture, desc) in CREDITCARD_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("CREDITCARD match missing group 0");
            let m = match capture {
                Some(idx) => caps.get(*idx).unwrap_or(full),
                None => full,
            };
            if !is_creditcard_like(m.as_str()) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if cc_seen.contains(&key) {
                continue;
            }
            cc_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "CREDITCARD".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.95,
                pattern: (*desc).to_string(),
            });
        }
    }

    // ACCOUNT
    let mut account_seen: HashSet<u64> = HashSet::new();
    for (re, validator, desc, capture) in ACCOUNT_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("ACCOUNT match missing group 0");
            let m = match capture {
                Some(idx) => caps.get(*idx).unwrap_or(full),
                None => full,
            };
            if !validate_account(m.as_str(), full.as_str(), *validator) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if account_seen.contains(&key) {
                continue;
            }
            account_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "ACCOUNT".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.85,
                pattern: (*desc).to_string(),
            });
        }
    }

    // LICENSE
    let mut license_seen: HashSet<u64> = HashSet::new();
    for (re, capture, desc) in LICENSE_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("LICENSE match missing group 0");
            let m = match capture {
                Some(idx) => caps.get(*idx).unwrap_or(full),
                None => full,
            };
            if !is_valid_license(m.as_str()) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if license_seen.contains(&key) {
                continue;
            }
            license_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "LICENSE".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.88,
                pattern: (*desc).to_string(),
            });
        }
    }

    // HEALTHPLAN
    let mut hp_seen: HashSet<u64> = HashSet::new();
    for (re, require_ctx, desc) in HEALTHPLAN_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("HEALTHPLAN match missing group 0");
            let m = match caps.get(1) {
                Some(v) => v,
                None => full,
            };
            if *require_ctx
                && !has_keyword_context(
                    &text,
                    full.start(),
                    full.as_str().len(),
                    &INSURANCE_KEYWORDS,
                )
            {
                continue;
            }
            if !validate_healthplan(m.as_str()) {
                continue;
            }
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if hp_seen.contains(&key) {
                continue;
            }
            hp_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "HEALTHPLAN".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: 0.85,
                pattern: (*desc).to_string(),
            });
        }
    }

    // PASSPORT (contextual + context-required patterns)
    let mut passport_seen: HashSet<u64> = HashSet::new();
    for (re, require_ctx, desc, conf) in PASSPORT_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("PASSPORT match missing group 0");
            let m = match caps.get(1) {
                Some(v) => v,
                None => full,
            };

            if *require_ctx {
                if !has_keyword_context(&text, m.start(), m.as_str().len(), &PASSPORT_KEYWORDS) {
                    continue;
                }
                // 9-digit US-format is high-collision; keep TS-style safety checks.
                if m.as_str().chars().filter(|c| c.is_ascii_digit()).count() == 9
                    && passport_looks_like_other_identifier(&text, m.start(), m.as_str())
                {
                    continue;
                }
            }

            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if passport_seen.contains(&key) {
                continue;
            }
            passport_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "PASSPORT".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: *conf,
                pattern: (*desc).to_string(),
            });
        }
    }

    // DATE (two passes: raw + OCR-normalized; dedupe by utf16 span)
    let mut date_seen: HashSet<u64> = HashSet::new();
    let normalized = normalize_ocr_text(&text);
    for source in [&text, normalized.as_str()] {
        let source_map = build_utf16_index_map(source);
        for (re, capture, desc, conf) in DATE_PATTERNS.iter() {
            for caps in re.captures_iter(source) {
                let full = caps.get(0).expect("DATE match missing group 0");
                let m = match capture {
                    Some(idx) => caps.get(*idx).unwrap_or(full),
                    None => full,
                };
                let start = byte_to_utf16(&source_map, m.start());
                let end = byte_to_utf16(&source_map, m.end());
                let key = ((start as u64) << 32) | (end as u64);
                if date_seen.contains(&key) {
                    continue;
                }
                date_seen.insert(key);

                // Indices are stable between source and original because OCR normalization is 1:1 char mapping.
                let start_byte = m.start();
                let end_byte = m.end();
                let slice = &text[start_byte..end_byte];

                out.push(IdentifierDetection {
                    filter_type: "DATE".to_string(),
                    character_start: start,
                    character_end: end,
                    text: slice.to_string(),
                    confidence: *conf,
                    pattern: (*desc).to_string(),
                });
            }
        }
    }

    // ADDRESS (street + geo) + highways + contextual cities + facility cities
    let mut addr_seen: HashSet<u64> = HashSet::new();
    for (re, capture, desc, conf) in ADDRESS_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let full = caps.get(0).expect("ADDRESS match missing group 0");
            let m = match capture {
                Some(idx) => caps.get(*idx).unwrap_or(full),
                None => full,
            };
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if addr_seen.contains(&key) {
                continue;
            }
            addr_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "ADDRESS".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: *conf,
                pattern: (*desc).to_string(),
            });
        }
    }

    for (re, desc, conf) in ADDRESS_HIGHWAY_PATTERNS.iter() {
        for m in re.find_iter(&text) {
            let start = byte_to_utf16(&map, m.start());
            let end = byte_to_utf16(&map, m.end());
            let key = ((start as u64) << 32) | (end as u64);
            if addr_seen.contains(&key) {
                continue;
            }
            addr_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "ADDRESS".to_string(),
                character_start: start,
                character_end: end,
                text: m.as_str().to_string(),
                confidence: *conf,
                pattern: (*desc).to_string(),
            });
        }
    }

    for caps in ADDRESS_CONTEXTUAL_CITY_RE.captures_iter(&text) {
        let city = match caps.get(2) {
            Some(v) => v,
            None => continue,
        };
        let city_text = city.as_str();
        if city_text.len() <= 3 || city_text.chars().all(|c| c.is_ascii_uppercase()) {
            continue;
        }
        if address_city_looks_like_person(&text, city_text, city.start()) {
            continue;
        }
        let start = byte_to_utf16(&map, city.start());
        let end = byte_to_utf16(&map, city.end());
        let key = ((start as u64) << 32) | (end as u64);
        if addr_seen.contains(&key) {
            continue;
        }
        addr_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "ADDRESS".to_string(),
            character_start: start,
            character_end: end,
            text: city_text.to_string(),
            confidence: 0.75,
            pattern: "Contextual city name".to_string(),
        });
    }

    for caps in ADDRESS_FACILITY_CITY_RE.captures_iter(&text) {
        let city = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let city_text = city.as_str();
        let after_start = next_char_boundary(&text, city.end());
        let after_end = next_char_boundary(&text, (after_start + 10).min(text.len()));
        let after_city = &text[after_start..after_end];
        if Regex::new(r"^,?\s*[A-Z]{2}\s+\d{5}")
            .expect("invalid address after-city regex")
            .is_match(after_city)
        {
            continue;
        }

        let start = byte_to_utf16(&map, city.start());
        let end = byte_to_utf16(&map, city.end());
        let key = ((start as u64) << 32) | (end as u64);
        if addr_seen.contains(&key) {
            continue;
        }
        addr_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "ADDRESS".to_string(),
            character_start: start,
            character_end: end,
            text: city_text.to_string(),
            confidence: 0.8,
            pattern: "City after facility name".to_string(),
        });
    }

    // VEHICLE
    let mut vehicle_seen: HashSet<u64> = HashSet::new();

    for caps in VIN_LABELED_RE.captures_iter(&text) {
        let vin = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_vin(vin.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, vin.start());
        let end = byte_to_utf16(&map, vin.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: vin.as_str().to_string(),
            confidence: 0.98,
            pattern: "Labeled VIN".to_string(),
        });
    }

    for caps in VIN_STANDALONE_RE.captures_iter(&text) {
        let vin = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_vin(vin.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, vin.start());
        let end = byte_to_utf16(&map, vin.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: vin.as_str().to_string(),
            confidence: 0.85,
            pattern: "Standalone VIN".to_string(),
        });
    }

    for caps in PLATE_LABELED_RE.captures_iter(&text) {
        let plate = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_license_plate(plate.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, plate.start());
        let end = byte_to_utf16(&map, plate.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: plate.as_str().to_string(),
            confidence: 0.95,
            pattern: "Labeled license plate".to_string(),
        });
    }

    for re in PLATE_PATTERNS.iter() {
        for caps in re.captures_iter(&text) {
            let plate = match caps.get(1) {
                Some(v) => v,
                None => continue,
            };
            if is_vital_sign_context(&text, plate.start(), plate.as_str()) {
                continue;
            }
            if !is_valid_license_plate(plate.as_str()) {
                continue;
            }
            let start = byte_to_utf16(&map, plate.start());
            let end = byte_to_utf16(&map, plate.end());
            let key = ((start as u64) << 32) | (end as u64);
            if vehicle_seen.contains(&key) {
                continue;
            }
            vehicle_seen.insert(key);
            out.push(IdentifierDetection {
                filter_type: "VEHICLE".to_string(),
                character_start: start,
                character_end: end,
                text: plate.as_str().to_string(),
                confidence: 0.75,
                pattern: "Standalone license plate".to_string(),
            });
        }
    }

    for caps in GPS_RE.captures_iter(&text) {
        let m = match caps.get(0) {
            Some(v) => v,
            None => continue,
        };
        let lat = caps.get(1).map(|v| v.as_str()).unwrap_or("");
        let lon = caps.get(2).map(|v| v.as_str()).unwrap_or("");
        if !is_valid_gps(lat, lon) {
            continue;
        }
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.92,
            pattern: "GPS coordinates".to_string(),
        });
    }

    for caps in IPV6_FULL_RE.captures_iter(&text) {
        let ip = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_ipv6(ip.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, ip.start());
        let end = byte_to_utf16(&map, ip.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: ip.as_str().to_string(),
            confidence: 0.9,
            pattern: "IPv6 address".to_string(),
        });
    }

    for caps in IPV6_COMPRESSED_RE.captures_iter(&text) {
        let ip = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_ipv6(ip.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, ip.start());
        let end = byte_to_utf16(&map, ip.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: ip.as_str().to_string(),
            confidence: 0.88,
            pattern: "IPv6 address (compressed)".to_string(),
        });
    }

    for caps in WORKSTATION_EXPLICIT_RE.captures_iter(&text) {
        let ws = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let start = byte_to_utf16(&map, ws.start());
        let end = byte_to_utf16(&map, ws.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: ws.as_str().to_string(),
            confidence: 0.93,
            pattern: "Workstation ID (explicit)".to_string(),
        });
    }

    for caps in WORKSTATION_LABELED_RE.captures_iter(&text) {
        let ws = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let start = byte_to_utf16(&map, ws.start());
        let end = byte_to_utf16(&map, ws.end());
        let key = ((start as u64) << 32) | (end as u64);
        if vehicle_seen.contains(&key) {
            continue;
        }
        vehicle_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "VEHICLE".to_string(),
            character_start: start,
            character_end: end,
            text: ws.as_str().to_string(),
            confidence: 0.95,
            pattern: "Workstation ID with context".to_string(),
        });
    }

    // DEVICE
    let mut device_seen: HashSet<u64> = HashSet::new();

    for caps in DEVICE_WITH_SERIAL_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !is_valid_device_identifier(id.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: id.as_str().to_string(),
            confidence: 0.95,
            pattern: "Device with serial/ID".to_string(),
        });
    }

    for caps in DEVICE_MODEL_RE.captures_iter(&text) {
        let full = caps.get(0).expect("DEVICE model group0");
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !has_keyword_context(&text, full.start(), full.as_str().len(), &DEVICE_KEYWORDS) {
            continue;
        }
        if !is_valid_device_identifier(id.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: id.as_str().to_string(),
            confidence: 0.9,
            pattern: "Model number (medical context)".to_string(),
        });
    }

    for caps in DEVICE_SERIAL_RE.captures_iter(&text) {
        let full = caps.get(0).expect("DEVICE serial group0");
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !has_keyword_context(&text, full.start(), full.as_str().len(), &DEVICE_KEYWORDS) {
            continue;
        }
        if !is_valid_device_identifier(id.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: id.as_str().to_string(),
            confidence: 0.9,
            pattern: "Serial number (medical context)".to_string(),
        });
    }

    for caps in DEVICE_SHORT_SERIAL_RE.captures_iter(&text) {
        let full = caps.get(0).expect("DEVICE short serial group0");
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !has_keyword_context(&text, full.start(), full.as_str().len(), &DEVICE_KEYWORDS) {
            continue;
        }
        let s = id.as_str();
        if !(s.chars().any(|c| c.is_ascii_alphabetic()) && s.chars().any(|c| c.is_ascii_digit())) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: s.to_string(),
            confidence: 0.85,
            pattern: "Short serial number (medical context)".to_string(),
        });
    }

    for caps in DEVICE_IMPLANT_DATE_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        if !has_keyword_context(&text, id.start(), id.as_str().len(), &DEVICE_KEYWORDS) {
            continue;
        }
        if !is_valid_device_identifier(id.as_str()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: id.as_str().to_string(),
            confidence: 0.85,
            pattern: "Implant date code".to_string(),
        });
    }

    for caps in DEVICE_MANUFACTURER_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let s = id.as_str();
        if !s.chars().any(|c| c.is_ascii_digit()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: s.to_string(),
            confidence: 0.92,
            pattern: "Manufacturer serial".to_string(),
        });
    }

    for caps in DEVICE_PREFIX_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let s = id.as_str();
        if !s.chars().any(|c| c.is_ascii_digit()) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if device_seen.contains(&key) {
            continue;
        }
        device_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "DEVICE".to_string(),
            character_start: start,
            character_end: end,
            text: s.to_string(),
            confidence: 0.88,
            pattern: "Device prefix serial".to_string(),
        });
    }

    // UNIQUE_ID
    let mut unique_seen: HashSet<u64> = HashSet::new();

    for caps in UNIQUE_BRAND_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let code = id.as_str();
        let parts: Vec<&str> = code.split('-').collect();
        if parts.len() < 2 {
            continue;
        }
        let has_numeric_part = parts
            .iter()
            .skip(1)
            .any(|p| p.chars().filter(|c| c.is_ascii_digit()).count() >= 3 || p.len() >= 6);
        if !has_numeric_part {
            continue;
        }
        let lower = code.to_ascii_lowercase();
        if lower.ends_with("-card")
            || lower.ends_with("-program")
            || lower.ends_with("-account")
            || lower.ends_with("-member")
        {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if unique_seen.contains(&key) {
            continue;
        }
        unique_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "UNIQUE_ID".to_string(),
            character_start: start,
            character_end: end,
            text: code.to_string(),
            confidence: 0.92,
            pattern: "Loyalty/Membership brand ID".to_string(),
        });
    }

    for caps in UNIQUE_LABELED_RE.captures_iter(&text) {
        let m = caps.get(0).expect("UNIQUE labeled group0");
        let full = m.as_str();
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if unique_seen.contains(&key) {
            continue;
        }
        unique_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "UNIQUE_ID".to_string(),
            character_start: start,
            character_end: end,
            text: full.to_string(),
            confidence: 0.94,
            pattern: "Labeled membership identifier".to_string(),
        });
    }

    for caps in UNIQUE_TRAVELER_RE.captures_iter(&text) {
        let m = caps.get(0).expect("UNIQUE traveler group0");
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if unique_seen.contains(&key) {
            continue;
        }
        unique_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "UNIQUE_ID".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.93,
            pattern: "Frequent traveler number".to_string(),
        });
    }

    for caps in UNIQUE_BADGE_RE.captures_iter(&text) {
        let m = caps.get(0).expect("UNIQUE badge group0");
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if unique_seen.contains(&key) {
            continue;
        }
        unique_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "UNIQUE_ID".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.91,
            pattern: "Badge/Access identifier".to_string(),
        });
    }

    for caps in UNIQUE_CONTEXT_ID_RE.captures_iter(&text) {
        let id = match caps.get(1) {
            Some(v) => v,
            None => continue,
        };
        let code = id.as_str();
        if code.chars().filter(|c| c.is_ascii_digit()).count() < 3 {
            continue;
        }
        if !has_keyword_context(&text, id.start(), code.len(), &UNIQUE_CONTEXT_KEYWORDS) {
            continue;
        }
        let start = byte_to_utf16(&map, id.start());
        let end = byte_to_utf16(&map, id.end());
        let key = ((start as u64) << 32) | (end as u64);
        if unique_seen.contains(&key) {
            continue;
        }
        unique_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "UNIQUE_ID".to_string(),
            character_start: start,
            character_end: end,
            text: code.to_string(),
            confidence: 0.88,
            pattern: "Contextual membership ID".to_string(),
        });
    }

    // AGE 90+ (HIPAA Safe Harbor)
    let mut age_seen: HashSet<u64> = HashSet::new();

    // Explicit ages: "92 years old", "91 y/o"
    for m in AGE_EXPLICIT_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.96,
            pattern: "Rust Age 90+ explicit".to_string(),
        });
    }

    // Labeled ages: "age 95", "aged 91"
    for m in AGE_LABELED_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.95,
            pattern: "Rust Age 90+ labeled".to_string(),
        });
    }

    // Field ages: "Age: 92", "Patient Age: 94"
    for m in AGE_FIELD_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.97,
            pattern: "Rust Age 90+ field".to_string(),
        });
    }

    // Compound ages: "93-year-old"
    for m in AGE_COMPOUND_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.96,
            pattern: "Rust Age 90+ compound".to_string(),
        });
    }

    // Ordinal ages: "in her 90s"
    for m in AGE_ORDINAL_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.92,
            pattern: "Rust Age 90s ordinal".to_string(),
        });
    }

    // Demographic ages: "92 M", "98 F"
    for m in AGE_DEMOGRAPHIC_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.92,
            pattern: "Rust Age 90+ demographic".to_string(),
        });
    }

    // Age ranges: "90-95 years"
    for caps in AGE_RANGE_RE.captures_iter(&text) {
        let m = match caps.get(0) {
            Some(v) => v,
            None => continue,
        };
        // Check if either end of range is 90+
        let age1_str = caps.get(1).map(|v| v.as_str()).unwrap_or("0");
        let age2_str = caps.get(2).map(|v| v.as_str()).unwrap_or("0");
        let age1: u32 = age1_str.parse().unwrap_or(0);
        let age2: u32 = age2_str.parse().unwrap_or(0);
        if age1 < 90 && age2 < 90 {
            continue;
        }
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if age_seen.contains(&key) {
            continue;
        }
        age_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "AGE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.94,
            pattern: "Rust Age range 90+".to_string(),
        });
    }

    // BIOMETRIC IDENTIFIERS
    let mut biometric_seen: HashSet<u64> = HashSet::new();

    for m in BIOMETRIC_LABELED_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if biometric_seen.contains(&key) {
            continue;
        }
        biometric_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "BIOMETRIC".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.94,
            pattern: "Rust Biometric labeled".to_string(),
        });
    }

    for m in BIOMETRIC_DNA_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if biometric_seen.contains(&key) {
            continue;
        }
        biometric_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "BIOMETRIC".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.95,
            pattern: "Rust DNA/Genetic identifier".to_string(),
        });
    }

    for m in BIOMETRIC_FACE_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if biometric_seen.contains(&key) {
            continue;
        }
        biometric_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "BIOMETRIC".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.93,
            pattern: "Rust Facial identifier".to_string(),
        });
    }

    // RELATIVE DATES
    let mut relative_seen: HashSet<u64> = HashSet::new();

    for m in RELATIVE_DAY_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if relative_seen.contains(&key) {
            continue;
        }
        relative_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "RELATIVE_DATE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.88,
            pattern: "Rust Relative day".to_string(),
        });
    }

    for m in RELATIVE_AGO_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if relative_seen.contains(&key) {
            continue;
        }
        relative_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "RELATIVE_DATE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.90,
            pattern: "Rust Relative ago/in".to_string(),
        });
    }

    for m in RELATIVE_KEYWORD_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if relative_seen.contains(&key) {
            continue;
        }
        relative_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "RELATIVE_DATE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.92,
            pattern: "Rust Relative keyword".to_string(),
        });
    }

    for m in RELATIVE_PERIOD_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if relative_seen.contains(&key) {
            continue;
        }
        relative_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "RELATIVE_DATE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.89,
            pattern: "Rust Relative period".to_string(),
        });
    }

    for m in RELATIVE_CONTEXT_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if relative_seen.contains(&key) {
            continue;
        }
        relative_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "RELATIVE_DATE".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.87,
            pattern: "Rust Relative context".to_string(),
        });
    }

    // HOSPITAL / HEALTHCARE FACILITY
    let mut hospital_seen: HashSet<u64> = HashSet::new();

    for m in HOSPITAL_PATTERN_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if hospital_seen.contains(&key) {
            continue;
        }
        hospital_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "HOSPITAL".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.90,
            pattern: "Rust Hospital name".to_string(),
        });
    }

    for m in HOSPITAL_SAINT_RE.find_iter(&text) {
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if hospital_seen.contains(&key) {
            continue;
        }
        hospital_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "HOSPITAL".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.92,
            pattern: "Rust St./Mount hospital".to_string(),
        });
    }

    for caps in HOSPITAL_LABELED_RE.captures_iter(&text) {
        let m = match caps.get(0) {
            Some(v) => v,
            None => continue,
        };
        let start = byte_to_utf16(&map, m.start());
        let end = byte_to_utf16(&map, m.end());
        let key = ((start as u64) << 32) | (end as u64);
        if hospital_seen.contains(&key) {
            continue;
        }
        hospital_seen.insert(key);
        out.push(IdentifierDetection {
            filter_type: "HOSPITAL".to_string(),
            character_start: start,
            character_end: end,
            text: m.as_str().to_string(),
            confidence: 0.94,
            pattern: "Rust Hospital labeled".to_string(),
        });
    }

    out.sort_by(|a, b| a.character_start.cmp(&b.character_start));
    out
}
