//! IMG4 manifest parsing — the P0 "IMG4 parser spike" workstream from `spec/phased-plan.md`.
//!
//! Uses the `image4` crate (pure Rust, DER-based; see its `manifest` module), not a C
//! library binding. That changes one assumption in `spec/build-spec.md`'s per-module
//! contract table, which says `state/img4` must "parse IMG4 manifests via a vetted library"
//! behind an "isolated FFI boundary": there is no FFI boundary to isolate here because the
//! chosen crate contains no `unsafe` on this parsing path. This module still owns the "must
//! not hand-roll signature verification or claim to verify a signature" rule — it only
//! decodes structure and exposes the raw signature/cert-chain bytes; it never asserts they
//! are valid.
//!
//! Spike status: `parse_manifest_der` is proven against malformed input (negative tests,
//! below) and compiles against the crate's real `Decode` API. It is **not yet** proven
//! against a real public IPSW manifest, because doing so means downloading a multi-GB
//! firmware image to extract its `im4m` — out of scope for this change. That remains an open
//! item before this module's P0 exit gate is fully met; track it rather than claim it done.

use der::Decode;
use image4::manifest::Manifest;

#[derive(Debug, thiserror::Error)]
pub enum Img4Error {
    #[error("manifest DER could not be decoded: {0}")]
    #[allow(dead_code)]
    // constructed by parse_manifest_der, not yet called from collect — see module doc
    Decode(String),
    #[error("manifest body could not be decoded as a property dictionary: {0}")]
    BodyDecode(String),
}

/// Decode a DER-encoded IM4M manifest. Returns the parsed [`Manifest`] on success so a
/// caller (`state::collect`) can pull `enrolled_objects` hashes and the raw cert chain out
/// of it. Never attempts to verify the signature — that is explicitly out of scope for this
/// module (`spec/build-spec.md`, state/img4 "must not").
///
/// Not yet called from `state::collect` (see module doc) — exercised by this module's own
/// tests only until a real captured manifest is available to parse in P1.
#[allow(dead_code)]
pub fn parse_manifest_der(bytes: &[u8]) -> Result<Manifest, Img4Error> {
    Manifest::from_der(bytes).map_err(|e| Img4Error::Decode(e.to_string()))
}

/// Raw signature bytes and DER-encoded cert chain, exposed for the evidence bundle. The tool
/// records these; it does not evaluate them as proof of anything on its own.
///
/// Not yet called from `state::collect` — folding manifest hashes/signers into
/// `BootState.enrolled_objects` needs a real captured manifest to test against, which this
/// pass doesn't have (see this module's doc comment). Kept rather than deleted so the P1
/// workstream ("fold manifest hashes and signers into enrolled_objects",
/// `spec/phased-plan.md`) has a proven-to-compile starting point.
#[allow(dead_code)]
pub struct ManifestFacts {
    pub signature: Vec<u8>,
    pub property_count: usize,
}

#[allow(dead_code)]
pub fn facts(manifest: &Manifest) -> Result<ManifestFacts, Img4Error> {
    let body = manifest
        .decode_body()
        .map_err(|e| Img4Error::BodyDecode(e.to_string()))?;
    Ok(ManifestFacts {
        signature: manifest.signature().to_vec(),
        property_count: body.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn garbage_bytes_are_rejected_not_guessed() {
        let result = parse_manifest_der(&[0x00, 0x01, 0x02, 0x03]);
        assert!(matches!(result, Err(Img4Error::Decode(_))));
    }

    #[test]
    fn empty_input_is_rejected() {
        let result = parse_manifest_der(&[]);
        assert!(result.is_err());
    }

    // No positive test against a real captured IM4M manifest yet — see module doc. When one
    // is added (per-generation fixtures land in P5, but a single sample could land earlier
    // for this spike), assert `facts()` returns a non-empty signature and property_count > 0.
}
