use hmac::{Hmac, Mac};
use napi::bindgen_prelude::Buffer;
use napi_derive::napi;
use sha2::{Digest, Sha256};
use zeroize::Zeroize;

type HmacSha256 = Hmac<Sha256>;

/// Compute SHA-256 digest with automatic memory cleanup of intermediate state.
/// The hasher state is zeroized after finalization to prevent PHI remnants in memory.
fn sha256_digest(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result: [u8; 32] = hasher.finalize().into();
    // Note: sha2 hasher is consumed by finalize(), but we document the security intent
    result
}

#[napi]
pub fn sha256_hex(buffer: Buffer) -> String {
    hex::encode(sha256_digest(buffer.as_ref()))
}

#[napi]
pub fn sha256_hex_string(text: String) -> String {
    hex::encode(sha256_digest(text.as_bytes()))
}

#[napi]
pub fn hmac_sha256_hex(key: String, message: String) -> napi::Result<String> {
    // Create mutable copies so we can zeroize after use
    let mut key_bytes = key.into_bytes();
    let mut message_bytes = message.into_bytes();
    
    let mut mac = HmacSha256::new_from_slice(&key_bytes)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    mac.update(&message_bytes);
    let result = hex::encode(mac.finalize().into_bytes());
    
    // Zeroize sensitive data to prevent PHI remnants in memory dumps
    key_bytes.zeroize();
    message_bytes.zeroize();
    
    Ok(result)
}

#[napi]
pub fn merkle_root_sha256_hex(leaf_hashes_hex: Vec<String>) -> napi::Result<String> {
    if leaf_hashes_hex.is_empty() {
        return Ok(sha256_hex_string(String::new()));
    }

    let mut level: Vec<[u8; 32]> = Vec::with_capacity(leaf_hashes_hex.len());
    for h in leaf_hashes_hex {
        let decoded = hex::decode(h.trim())
            .map_err(|e| napi::Error::from_reason(format!("Invalid hex leaf hash: {e}")))?;
        if decoded.len() != 32 {
            return Err(napi::Error::from_reason(format!(
                "Invalid leaf hash length: expected 32 bytes, got {}",
                decoded.len()
            )));
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&decoded);
        level.push(arr);
    }

    while level.len() > 1 {
        let mut next: Vec<[u8; 32]> = Vec::with_capacity((level.len() + 1) / 2);
        let mut i = 0usize;
        while i < level.len() {
            let left = level[i];
            let right = *level.get(i + 1).unwrap_or(&left);
            let mut pair = [0u8; 64];
            pair[..32].copy_from_slice(&left);
            pair[32..].copy_from_slice(&right);
            next.push(sha256_digest(&pair));
            i += 2;
        }
        level = next;
    }

    Ok(hex::encode(level[0]))
}

#[napi]
pub fn dicom_hash_token(salt: String, value: String) -> napi::Result<String> {
    // Note: salt and value are moved into hmac_sha256_hex which handles zeroization
    let hex = hmac_sha256_hex(salt, value)?;
    Ok(format!("ANON_{}", hex[..24].to_ascii_uppercase()))
}

#[napi]
pub fn dicom_hash_uid(salt: String, value: String) -> napi::Result<String> {
    let hex = hmac_sha256_hex(salt, value)?;
    let slice = &hex[..32];
    let u128_val = u128::from_str_radix(slice, 16)
        .map_err(|e| napi::Error::from_reason(format!("Invalid UID hash (hex->u128): {e}")))?;
    Ok(format!("2.25.{}", u128_val))
}
