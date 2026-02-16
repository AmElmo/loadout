//! Token estimation utilities for context window usage tracking.
//!
//! Uses a simple heuristic of ~4 characters per token, which is within
//! ~10-15% of actual BPE tokenization for English text and code.

/// Estimate the number of tokens in a text string.
///
/// Uses the heuristic of approximately 4 characters per token.
/// Returns 0 for empty strings.
pub fn estimate_tokens(text: &str) -> u32 {
    if text.is_empty() {
        return 0;
    }
    ((text.len() as f64) / 4.0).ceil() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_string() {
        assert_eq!(estimate_tokens(""), 0);
    }

    #[test]
    fn test_short_string() {
        // "hello" = 5 chars → ceil(5/4) = 2
        assert_eq!(estimate_tokens("hello"), 2);
    }

    #[test]
    fn test_exact_multiple() {
        // 8 chars → ceil(8/4) = 2
        assert_eq!(estimate_tokens("abcdefgh"), 2);
    }

    #[test]
    fn test_longer_content() {
        // 100 chars → ceil(100/4) = 25
        let text = "a".repeat(100);
        assert_eq!(estimate_tokens(&text), 25);
    }

    #[test]
    fn test_not_exact_multiple() {
        // 5 chars → ceil(5/4) = 2
        assert_eq!(estimate_tokens("abcde"), 2);
        // 9 chars → ceil(9/4) = 3
        assert_eq!(estimate_tokens("abcdefghi"), 3);
    }
}
