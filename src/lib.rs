//! QuietTicket（静票）— Ootle template for claim-ticket silent voting.
//!
//! Not a Phantom Drop reskin: envelopes become **ballot credentials**; spend becomes
//! **sealed cast + nullifier**; reclaim becomes **close / reveal / tally**.
//! Enrollment is open claim-tickets (delta vs Séance fixed pubkey rings).
//!
//! Primary judge path remains the walletless browser sim in `site/`. This template is
//! the on-chain shape exercised by `tests/engine_flow.rs` when the toolchain works.

pub mod domain;

use tari_template_lib::prelude::*;

#[template]
mod quiet_ticket {
    use super::*;

    /// On-chain poll: ticket commitments, nullifiers, sealed ballots, tally.
    pub struct QuietTicket {
        poll_id: Hash32,
        question: String,
        options: Vec<String>,
        ticket_cap: u32,
        deadline_epoch: u64,
        /// Commitment to the reveal key (organizer keeps key off-chain until close).
        reveal_key_commit: Hash32,
        /// One commitment per minted claim ticket (holder secret stays off-chain).
        ticket_commitments: Vec<Hash32>,
        claimed: Vec<bool>,
        voted: Vec<bool>,
        nullifiers: Vec<Hash32>,
        /// Opaque sealed ballots; MVP tally reads byte0 as choice index after close.
        sealed_ballots: Vec<Vec<u8>>,
        closed: bool,
        tally: Vec<u32>,
        tallied: bool,
    }

    impl QuietTicket {
        /// Open a poll. `deadline_epoch` uses `Consensus::current_epoch()` (0 in TemplateTest default).
        pub fn create(
            poll_id: Hash32,
            question: String,
            options: Vec<String>,
            ticket_cap: u32,
            deadline_epoch: u64,
            reveal_key_commit: Hash32,
        ) -> Component<Self> {
            assert!(!question.is_empty(), "question required");
            assert!(
                options.len() >= 2 && options.len() <= 6,
                "need 2–6 options"
            );
            assert!(ticket_cap >= 1 && ticket_cap <= 64, "ticket_cap 1–64");

            Component::new(Self {
                poll_id,
                question,
                options,
                ticket_cap,
                deadline_epoch,
                reveal_key_commit,
                ticket_commitments: Vec::new(),
                claimed: Vec::new(),
                voted: Vec::new(),
                nullifiers: Vec::new(),
                sealed_ballots: Vec::new(),
                closed: false,
                tally: Vec::new(),
                tallied: false,
            })
            .with_access_rules(AccessRules::allow_all())
            .create()
        }

        /// Mint N ticket commitments (organizer). Secrets / claim links stay off-chain.
        pub fn mint_tickets(&mut self, commitments: Vec<Hash32>) {
            assert!(!self.closed, "poll closed");
            assert!(
                self.ticket_commitments.is_empty(),
                "tickets already minted"
            );
            assert!(
                !commitments.is_empty() && (commitments.len() as u32) <= self.ticket_cap,
                "commitment count must be 1..=ticket_cap"
            );
            let n = commitments.len();
            self.ticket_commitments = commitments;
            self.claimed = vec![false; n];
            self.voted = vec![false; n];
            emit_event("mint_tickets", metadata![
                "count" => n.to_string(),
            ]);
        }

        /// Claim ticket `index` by revealing `ticket_secret` whose hash matches the commitment.
        pub fn claim(&mut self, index: u32, ticket_secret: Vec<u8>) {
            assert!(!self.closed, "poll closed");
            let i = index as usize;
            assert!(i < self.ticket_commitments.len(), "bad ticket index");
            assert!(!self.claimed[i], "ticket already claimed");

            // Domain tag must match `domain::TAG_TICKET` / site/sim.js
            let got = intrinsics::hash_sha256_parts(&[b"qt:ticket:", self.poll_id.as_ref(), ticket_secret.as_slice()]);
            assert!(
                got == self.ticket_commitments[i],
                "ticket secret does not match commitment"
            );
            self.claimed[i] = true;
            emit_event("claim", metadata![
                "index" => index.to_string(),
            ]);
        }

        /// Cast a sealed ballot for a claimed ticket. Nullifier must be unique (double-vote reject).
        pub fn cast(&mut self, index: u32, nullifier: Hash32, sealed_ballot: Vec<u8>) {
            assert!(!self.closed, "poll closed");
            let i = index as usize;
            assert!(i < self.ticket_commitments.len(), "bad ticket index");
            assert!(self.claimed[i], "claim ticket before casting");
            assert!(!self.voted[i], "ticket already voted");
            assert!(!sealed_ballot.is_empty(), "empty ballot");

            for n in &self.nullifiers {
                assert!(*n != nullifier, "nullifier already spent (double vote)");
            }

            self.nullifiers.push(nullifier);
            self.sealed_ballots.push(sealed_ballot);
            self.voted[i] = true;
            emit_event("cast", metadata![
                "index" => index.to_string(),
            ]);
        }

        /// Close after deadline. Default TemplateTest epoch is 0 — use deadline_epoch=0 in tests.
        pub fn close(&mut self) {
            assert!(!self.closed, "already closed");
            let now = Consensus::current_epoch();
            assert!(now >= self.deadline_epoch, "deadline not reached");
            self.closed = true;
            emit_event("close", metadata![
                "ballots" => self.sealed_ballots.len().to_string(),
            ]);
        }

        /// Reveal sealed ballots (MVP: byte0 = choice index) and publish counts.
        pub fn reveal_and_tally(&mut self) -> Vec<u32> {
            assert!(self.closed, "close before tally");
            assert!(!self.tallied, "already tallied");

            let mut counts = vec![0u32; self.options.len()];
            for sealed in &self.sealed_ballots {
                let choice = sealed[0] as usize;
                assert!(choice < counts.len(), "choice out of range");
                counts[choice] += 1;
            }
            self.tally = counts.clone();
            self.tallied = true;
            emit_event("tally", metadata![
                "total" => self.sealed_ballots.len().to_string(),
            ]);
            counts
        }

        pub fn question(&self) -> String {
            self.question.clone()
        }

        pub fn options(&self) -> Vec<String> {
            self.options.clone()
        }

        pub fn ticket_count(&self) -> u32 {
            self.ticket_commitments.len() as u32
        }

        pub fn is_closed(&self) -> bool {
            self.closed
        }

        pub fn is_tallied(&self) -> bool {
            self.tallied
        }

        pub fn tally(&self) -> Vec<u32> {
            self.tally.clone()
        }

        pub fn ballot_count(&self) -> u32 {
            self.sealed_ballots.len() as u32
        }

        pub fn nullifier_count(&self) -> u32 {
            self.nullifiers.len() as u32
        }

        pub fn is_claimed(&self, index: u32) -> bool {
            self.claimed.get(index as usize).copied().unwrap_or(false)
        }

        pub fn is_voted(&self, index: u32) -> bool {
            self.voted.get(index as usize).copied().unwrap_or(false)
        }
    }
}
