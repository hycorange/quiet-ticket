//! Domain-separated tags for QuietTicket commitments / nullifiers.
//! Browser sim (`site/sim.js`) and this template must stay aligned.
//!
//! These are **not** Phantom Drop envelope tags — ballot credential + sealed tally.

/// Ticket commitment: `SHA256("qt:ticket:" || poll_id || ticket_secret)`
pub const TAG_TICKET: &[u8] = b"qt:ticket:";

/// Nullifier: `SHA256("qt:nullifier:" || poll_id || nullifier_seed)`
pub const TAG_NULLIFIER: &[u8] = b"qt:nullifier:";

/// Reveal-key commitment: `SHA256("qt:reveal:" || poll_id || reveal_key)`
pub const TAG_REVEAL: &[u8] = b"qt:reveal:";
