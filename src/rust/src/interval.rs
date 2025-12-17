//! IntervalTreeSpanIndex - O(log n) Span Overlap Detection
//!
//! PERFORMANCE: Reduces overlap detection from O(n²) to O(n log n)
//!
//! Provides a full interval tree implementation to replace @flatten-js/interval-tree.
//! Supports insert, findOverlaps, remove, and batch operations.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;
use std::sync::Mutex;

/// Type specificity ranking for span disambiguation
/// Higher values = more specific/trustworthy
fn get_type_specificity(filter_type: &str) -> i32 {
    match filter_type {
        // High specificity - structured patterns
        "SSN" => 100,
        "MRN" => 95,
        "CREDIT_CARD" => 90,
        "ACCOUNT" => 85,
        "LICENSE" => 85,
        "PASSPORT" => 85,
        "IBAN" => 85,
        "HEALTH_PLAN" => 85,
        "EMAIL" => 80,
        "PHONE" => 75,
        "FAX" => 75,
        "IP" => 75,
        "URL" => 75,
        "MAC_ADDRESS" => 75,
        "BITCOIN" => 75,
        "VEHICLE" => 70,
        "DEVICE" => 70,
        "BIOMETRIC" => 70,
        // Medium specificity
        "DATE" => 60,
        "ZIPCODE" => 55,
        "ADDRESS" => 50,
        "CITY" => 45,
        "STATE" => 45,
        "COUNTY" => 45,
        // Lower specificity - context-dependent
        "AGE" => 40,
        "RELATIVE_DATE" => 40,
        "PROVIDER_NAME" => 36,
        "NAME" => 35,
        "OCCUPATION" => 30,
        "CUSTOM" => 20,
        _ => 25,
    }
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct SpanInput {
    pub character_start: i32,
    pub character_end: i32,
    pub filter_type: String,
    pub confidence: f64,
    pub priority: i32,
    pub text: String,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct OverlapResult {
    pub kept_indices: Vec<i32>,
}

/// Calculate composite score for a span
fn calculate_span_score(span: &SpanInput) -> f64 {
    let type_specificity = get_type_specificity(&span.filter_type);
    let length = (span.character_end - span.character_start) as f64;

    // Weighted scoring:
    // - Length: 40% weight (longer spans capture more context)
    // - Confidence: 30% weight (detection confidence)
    // - Type specificity: 20% weight (structured patterns > fuzzy matches)
    // - Priority: 10% weight (filter-level priority)
    let length_score = (length / 50.0).min(1.0) * 40.0;
    let confidence_score = span.confidence * 30.0;
    let type_score = (type_specificity as f64 / 100.0) * 20.0;
    let priority_score = (span.priority as f64 / 100.0).min(1.0) * 10.0;

    length_score + confidence_score + type_score + priority_score
}

/// Check if two spans overlap
fn spans_overlap(a: &SpanInput, b: &SpanInput) -> bool {
    !(a.character_end <= b.character_start || a.character_start >= b.character_end)
}

/// Check if span a contains span b
fn span_contains(a: &SpanInput, b: &SpanInput) -> bool {
    a.character_start <= b.character_start && a.character_end >= b.character_end
}

/// Drop overlapping spans using optimized algorithm
/// Returns indices of spans to keep
#[napi]
pub fn drop_overlapping_spans_fast(spans: Vec<SpanInput>) -> Vec<i32> {
    if spans.is_empty() {
        return vec![];
    }
    if spans.len() == 1 {
        return vec![0];
    }

    // STEP 1: Remove exact duplicates (same position + type)
    let mut unique_map: HashMap<String, (usize, &SpanInput)> = HashMap::new();
    for (idx, span) in spans.iter().enumerate() {
        let key = format!(
            "{}-{}-{}",
            span.character_start, span.character_end, span.filter_type
        );
        if let Some((_, existing)) = unique_map.get(&key) {
            if existing.confidence < span.confidence {
                unique_map.insert(key, (idx, span));
            }
        } else {
            unique_map.insert(key, (idx, span));
        }
    }

    let mut unique_spans: Vec<(usize, &SpanInput, f64)> = unique_map
        .into_values()
        .map(|(idx, span)| (idx, span, calculate_span_score(span)))
        .collect();

    if unique_spans.len() == 1 {
        return vec![unique_spans[0].0 as i32];
    }

    // STEP 2: Sort by score (descending), then position (ascending)
    unique_spans.sort_by(|a, b| {
        let score_diff = b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal);
        if score_diff != std::cmp::Ordering::Equal {
            return score_diff;
        }
        let pos_diff = a.1.character_start.cmp(&b.1.character_start);
        if pos_diff != std::cmp::Ordering::Equal {
            return pos_diff;
        }
        let len_a = a.1.character_end - a.1.character_start;
        let len_b = b.1.character_end - b.1.character_start;
        len_b.cmp(&len_a)
    });

    // STEP 3: Greedy overlap removal with containment logic
    let mut kept: Vec<(usize, &SpanInput)> = Vec::new();

    for (orig_idx, span, _score) in &unique_spans {
        let mut should_keep = true;
        let mut index_to_replace: Option<usize> = None;

        for (kept_idx, (_, existing)) in kept.iter().enumerate() {
            if !spans_overlap(span, existing) {
                continue;
            }

            // There IS an overlap - determine what to do
            let span_contains_existing = span_contains(span, existing);
            let existing_contains_span = span_contains(existing, span);

            let span_spec = get_type_specificity(&span.filter_type);
            let exist_spec = get_type_specificity(&existing.filter_type);

            if span_contains_existing {
                // New span contains existing
                if span_spec <= exist_spec {
                    // Same or more specific type in existing - keep existing, reject new
                    should_keep = false;
                    break;
                }
            } else if existing_contains_span {
                // Existing contains new span
                if span_spec > exist_spec && span.confidence >= 0.9 {
                    // New span is more specific with high confidence - replace existing
                    index_to_replace = Some(kept_idx);
                    break;
                }
                // Same type or existing is more specific - reject new span
                should_keep = false;
                break;
            } else {
                // Partial overlap - existing wins (already sorted by score)
                should_keep = false;
                break;
            }
        }

        if let Some(replace_idx) = index_to_replace {
            kept[replace_idx] = (*orig_idx, span);
        } else if should_keep {
            kept.push((*orig_idx, span));
        }
    }

    // Sort by original index order for stable output
    kept.sort_by_key(|(_, span)| span.character_start);

    kept.into_iter().map(|(idx, _)| idx as i32).collect()
}

/// Merge spans from multiple sources
/// Returns indices of spans to keep from the combined list
#[napi]
pub fn merge_spans_fast(span_arrays: Vec<Vec<SpanInput>>) -> Vec<i32> {
    // Flatten all spans with their original indices
    let mut all_spans: Vec<SpanInput> = Vec::new();
    let mut index_mapping: Vec<(usize, usize)> = Vec::new(); // (array_idx, span_idx)

    for (array_idx, spans) in span_arrays.iter().enumerate() {
        for (span_idx, span) in spans.iter().enumerate() {
            index_mapping.push((array_idx, span_idx));
            all_spans.push(span.clone());
        }
    }

    // Use the drop_overlapping_spans_fast to get kept indices
    let kept = drop_overlapping_spans_fast(all_spans);

    kept
}

/// Find groups of spans at identical positions (for disambiguation)
#[napi]
pub fn get_identical_span_groups(spans: Vec<SpanInput>) -> Vec<Vec<i32>> {
    let mut groups: HashMap<String, Vec<i32>> = HashMap::new();

    for (idx, span) in spans.iter().enumerate() {
        let key = format!("{}-{}", span.character_start, span.character_end);
        groups.entry(key).or_insert_with(Vec::new).push(idx as i32);
    }

    groups
        .into_values()
        .filter(|group| group.len() > 1)
        .collect()
}

/// Get type specificity for a filter type (exposed to JS)
#[napi]
pub fn get_filter_type_specificity(filter_type: String) -> i32 {
    get_type_specificity(&filter_type)
}

/// Calculate span score (exposed to JS for debugging)
#[napi]
pub fn calculate_span_score_js(span: SpanInput) -> f64 {
    calculate_span_score(&span)
}

// ============================================================================
// Full Interval Tree Implementation
// Replaces @flatten-js/interval-tree for all IntervalTreeSpanIndex operations
// ============================================================================

/// Stored span data in the interval tree
#[derive(Clone, Debug)]
struct StoredSpan {
    key: String,
    start: i32,
    end: i32,
    filter_type: String,
    confidence: f64,
    priority: i32,
    text: String,
}

/// Span data returned to JavaScript
#[napi(object)]
#[derive(Clone, Debug)]
pub struct SpanData {
    pub character_start: i32,
    pub character_end: i32,
    pub filter_type: String,
    pub confidence: f64,
    pub priority: i32,
    pub text: String,
}

/// Internal interval tree node
#[derive(Clone, Debug)]
struct IntervalNode {
    start: i32,
    end: i32,
    max_end: i32, // Augmented: max end value in subtree
    spans: Vec<StoredSpan>,
    left: Option<Box<IntervalNode>>,
    right: Option<Box<IntervalNode>>,
}

impl IntervalNode {
    fn new(start: i32, end: i32, span: StoredSpan) -> Self {
        IntervalNode {
            start,
            end,
            max_end: end,
            spans: vec![span],
            left: None,
            right: None,
        }
    }

    /// Update max_end based on children
    fn update_max(&mut self) {
        self.max_end = self.end;
        if let Some(ref left) = self.left {
            self.max_end = self.max_end.max(left.max_end);
        }
        if let Some(ref right) = self.right {
            self.max_end = self.max_end.max(right.max_end);
        }
    }

    /// Insert a span into this subtree
    fn insert(&mut self, start: i32, end: i32, span: StoredSpan) {
        // If same interval, add to this node's spans
        if start == self.start && end == self.end {
            self.spans.push(span);
            return;
        }

        // Insert into left or right subtree based on start position
        if start < self.start || (start == self.start && end < self.end) {
            if let Some(ref mut left) = self.left {
                left.insert(start, end, span);
            } else {
                self.left = Some(Box::new(IntervalNode::new(start, end, span)));
            }
        } else {
            if let Some(ref mut right) = self.right {
                right.insert(start, end, span);
            } else {
                self.right = Some(Box::new(IntervalNode::new(start, end, span)));
            }
        }

        self.update_max();
    }

    /// Find all spans overlapping with [query_start, query_end]
    fn find_overlaps(&self, query_start: i32, query_end: i32, results: &mut Vec<StoredSpan>) {
        // Check if this node's interval overlaps with query
        if self.start < query_end && self.end > query_start {
            results.extend(self.spans.clone());
        }

        // Check left subtree if it could contain overlapping intervals
        if let Some(ref left) = self.left {
            if left.max_end > query_start {
                left.find_overlaps(query_start, query_end, results);
            }
        }

        // Check right subtree if query could overlap with intervals starting after this node
        if let Some(ref right) = self.right {
            if query_end > self.start {
                right.find_overlaps(query_start, query_end, results);
            }
        }
    }

    /// Remove a span by key, returns true if found and removed
    fn remove(&mut self, start: i32, end: i32, key: &str) -> bool {
        if start == self.start && end == self.end {
            let initial_len = self.spans.len();
            self.spans.retain(|s| s.key != key);
            return self.spans.len() < initial_len;
        }

        let removed = if start < self.start || (start == self.start && end < self.end) {
            if let Some(ref mut left) = self.left {
                left.remove(start, end, key)
            } else {
                false
            }
        } else {
            if let Some(ref mut right) = self.right {
                right.remove(start, end, key)
            } else {
                false
            }
        };

        if removed {
            self.update_max();
        }
        removed
    }

    /// Collect all spans in the subtree
    fn collect_all(&self, results: &mut Vec<StoredSpan>) {
        results.extend(self.spans.clone());
        if let Some(ref left) = self.left {
            left.collect_all(results);
        }
        if let Some(ref right) = self.right {
            right.collect_all(results);
        }
    }
}

/// Internal state for the interval tree
struct IntervalTreeState {
    root: Option<IntervalNode>,
    span_map: HashMap<String, StoredSpan>,
    size: usize,
}

impl IntervalTreeState {
    fn new() -> Self {
        IntervalTreeState {
            root: None,
            span_map: HashMap::new(),
            size: 0,
        }
    }
}

/// VulpesIntervalTree - Full interval tree implementation for span management
///
/// Replaces @flatten-js/interval-tree with a Rust implementation providing:
/// - O(log n) insert
/// - O(log n + k) overlap queries (k = number of results)
/// - O(log n) remove
#[napi]
pub struct VulpesIntervalTree {
    state: Mutex<IntervalTreeState>,
}

#[napi]
impl VulpesIntervalTree {
    #[napi(constructor)]
    pub fn new() -> Self {
        VulpesIntervalTree {
            state: Mutex::new(IntervalTreeState::new()),
        }
    }

    /// Generate unique key for a span
    fn generate_key(span: &SpanData) -> String {
        format!(
            "{}-{}-{}-{}",
            span.character_start, span.character_end, span.filter_type, span.text
        )
    }

    /// Insert a span into the tree
    /// O(log n)
    #[napi]
    pub fn insert(&self, span: SpanData) -> String {
        let key = Self::generate_key(&span);
        let stored = StoredSpan {
            key: key.clone(),
            start: span.character_start,
            end: span.character_end,
            filter_type: span.filter_type,
            confidence: span.confidence,
            priority: span.priority,
            text: span.text,
        };

        let mut state = self.state.lock().unwrap();

        // Store in map for quick lookup
        state.span_map.insert(key.clone(), stored.clone());

        // Insert into tree
        if let Some(ref mut root) = state.root {
            root.insert(stored.start, stored.end, stored);
        } else {
            state.root = Some(IntervalNode::new(stored.start, stored.end, stored));
        }

        state.size += 1;
        key
    }

    /// Insert multiple spans at once
    #[napi]
    pub fn insert_all(&self, spans: Vec<SpanData>) {
        for span in spans {
            self.insert(span);
        }
    }

    /// Find all spans that overlap with the given range
    /// O(log n + k) where k = number of overlaps
    #[napi]
    pub fn find_overlaps(&self, start: i32, end: i32) -> Vec<SpanData> {
        let state = self.state.lock().unwrap();

        let mut results: Vec<StoredSpan> = Vec::new();
        if let Some(ref root) = state.root {
            root.find_overlaps(start, end, &mut results);
        }

        // Deduplicate by key
        let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        results
            .into_iter()
            .filter(|s| seen.insert(s.key.clone()))
            .map(|s| SpanData {
                character_start: s.start,
                character_end: s.end,
                filter_type: s.filter_type,
                confidence: s.confidence,
                priority: s.priority,
                text: s.text,
            })
            .collect()
    }

    /// Find all spans that overlap with a given span
    #[napi]
    pub fn find_overlapping_spans(&self, span: SpanData) -> Vec<SpanData> {
        self.find_overlaps(span.character_start, span.character_end)
    }

    /// Check if a span overlaps with any existing span
    /// O(log n)
    #[napi]
    pub fn has_overlap(&self, span: SpanData) -> bool {
        let overlaps = self.find_overlaps(span.character_start, span.character_end);
        !overlaps.is_empty()
    }

    /// Remove a span from the tree by key
    /// O(log n)
    #[napi]
    pub fn remove(&self, span: SpanData) -> bool {
        let key = Self::generate_key(&span);
        self.remove_by_key(key)
    }

    /// Remove a span by its key
    #[napi]
    pub fn remove_by_key(&self, key: String) -> bool {
        let mut state = self.state.lock().unwrap();

        if let Some(stored) = state.span_map.remove(&key) {
            if let Some(ref mut root) = state.root {
                root.remove(stored.start, stored.end, &key);
            }
            state.size -= 1;
            return true;
        }
        false
    }

    /// Clear all spans from the tree
    #[napi]
    pub fn clear(&self) {
        let mut state = self.state.lock().unwrap();
        state.root = None;
        state.span_map.clear();
        state.size = 0;
    }

    /// Get all spans in the tree
    #[napi]
    pub fn get_all_spans(&self) -> Vec<SpanData> {
        let state = self.state.lock().unwrap();
        state
            .span_map
            .values()
            .map(|s| SpanData {
                character_start: s.start,
                character_end: s.end,
                filter_type: s.filter_type.clone(),
                confidence: s.confidence,
                priority: s.priority,
                text: s.text.clone(),
            })
            .collect()
    }

    /// Get the number of spans in the tree
    #[napi(getter)]
    pub fn size(&self) -> u32 {
        let state = self.state.lock().unwrap();
        state.size as u32
    }

    /// Check if a span exists by key
    #[napi]
    pub fn has(&self, span: SpanData) -> bool {
        let key = Self::generate_key(&span);
        let state = self.state.lock().unwrap();
        state.span_map.contains_key(&key)
    }

    /// Get a span by its key
    #[napi]
    pub fn get(&self, key: String) -> Option<SpanData> {
        let state = self.state.lock().unwrap();
        state.span_map.get(&key).map(|s| SpanData {
            character_start: s.start,
            character_end: s.end,
            filter_type: s.filter_type.clone(),
            confidence: s.confidence,
            priority: s.priority,
            text: s.text.clone(),
        })
    }
}

impl Default for VulpesIntervalTree {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_span(start: i32, end: i32, filter_type: &str, confidence: f64) -> SpanInput {
        SpanInput {
            character_start: start,
            character_end: end,
            filter_type: filter_type.to_string(),
            confidence,
            priority: 100,
            text: "test".to_string(),
        }
    }

    fn make_span_data(start: i32, end: i32, filter_type: &str, text: &str) -> SpanData {
        SpanData {
            character_start: start,
            character_end: end,
            filter_type: filter_type.to_string(),
            confidence: 0.9,
            priority: 100,
            text: text.to_string(),
        }
    }

    #[test]
    fn test_no_overlap() {
        let spans = vec![
            make_span(0, 5, "NAME", 0.9),
            make_span(10, 15, "EMAIL", 0.95),
        ];
        let kept = drop_overlapping_spans_fast(spans);
        assert_eq!(kept.len(), 2);
    }

    #[test]
    fn test_simple_overlap() {
        let spans = vec![
            make_span(0, 10, "NAME", 0.9),
            make_span(5, 15, "EMAIL", 0.95),
        ];
        let kept = drop_overlapping_spans_fast(spans);
        assert_eq!(kept.len(), 1);
    }

    #[test]
    fn test_containment_more_specific_wins() {
        let spans = vec![
            make_span(0, 20, "NAME", 0.9), // Less specific, contains SSN
            make_span(5, 14, "SSN", 0.95), // More specific, contained
        ];
        let kept = drop_overlapping_spans_fast(spans);
        assert_eq!(kept.len(), 1);
        // SSN should win due to higher specificity
    }

    #[test]
    fn test_identical_positions_different_types() {
        let spans = vec![
            make_span(0, 10, "PHONE", 0.9),
            make_span(0, 10, "SSN", 0.95),
        ];
        let groups = get_identical_span_groups(spans);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].len(), 2);
    }

    // ==================== VulpesIntervalTree Tests ====================

    #[test]
    fn test_interval_tree_insert_and_size() {
        let tree = VulpesIntervalTree::new();
        assert_eq!(tree.size(), 0);

        tree.insert(make_span_data(0, 10, "NAME", "John"));
        assert_eq!(tree.size(), 1);

        tree.insert(make_span_data(20, 30, "EMAIL", "test@example.com"));
        assert_eq!(tree.size(), 2);
    }

    #[test]
    fn test_interval_tree_find_overlaps() {
        let tree = VulpesIntervalTree::new();
        tree.insert(make_span_data(0, 10, "NAME", "John"));
        tree.insert(make_span_data(20, 30, "EMAIL", "test@example.com"));
        tree.insert(make_span_data(5, 15, "PHONE", "555-1234"));

        // Query that overlaps with NAME and PHONE
        let overlaps = tree.find_overlaps(8, 12);
        assert_eq!(overlaps.len(), 2);

        // Query that overlaps with EMAIL only
        let overlaps = tree.find_overlaps(25, 35);
        assert_eq!(overlaps.len(), 1);
        assert_eq!(overlaps[0].filter_type, "EMAIL");

        // Query that overlaps with nothing
        let overlaps = tree.find_overlaps(40, 50);
        assert_eq!(overlaps.len(), 0);
    }

    #[test]
    fn test_interval_tree_has_overlap() {
        let tree = VulpesIntervalTree::new();
        tree.insert(make_span_data(0, 10, "NAME", "John"));

        let query_overlapping = make_span_data(5, 15, "TEST", "test");
        assert!(tree.has_overlap(query_overlapping));

        let query_not_overlapping = make_span_data(20, 30, "TEST", "test");
        assert!(!tree.has_overlap(query_not_overlapping));
    }

    #[test]
    fn test_interval_tree_remove() {
        let tree = VulpesIntervalTree::new();
        let span = make_span_data(0, 10, "NAME", "John");
        tree.insert(span.clone());
        assert_eq!(tree.size(), 1);

        let removed = tree.remove(span);
        assert!(removed);
        assert_eq!(tree.size(), 0);

        // Try to remove again - should return false
        let span2 = make_span_data(0, 10, "NAME", "John");
        let removed_again = tree.remove(span2);
        assert!(!removed_again);
    }

    #[test]
    fn test_interval_tree_clear() {
        let tree = VulpesIntervalTree::new();
        tree.insert(make_span_data(0, 10, "NAME", "John"));
        tree.insert(make_span_data(20, 30, "EMAIL", "test@example.com"));
        assert_eq!(tree.size(), 2);

        tree.clear();
        assert_eq!(tree.size(), 0);
        assert!(tree.get_all_spans().is_empty());
    }

    #[test]
    fn test_interval_tree_get_all_spans() {
        let tree = VulpesIntervalTree::new();
        tree.insert(make_span_data(0, 10, "NAME", "John"));
        tree.insert(make_span_data(20, 30, "EMAIL", "test@example.com"));

        let all_spans = tree.get_all_spans();
        assert_eq!(all_spans.len(), 2);
    }

    #[test]
    fn test_interval_tree_has() {
        let tree = VulpesIntervalTree::new();
        let span = make_span_data(0, 10, "NAME", "John");

        assert!(!tree.has(span.clone()));
        tree.insert(span.clone());
        assert!(tree.has(span));
    }
}
