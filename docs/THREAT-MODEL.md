# QuietTicket — threat-model sketch (MVP)

Scope: the **browser simulation** (`site/`) and the intended Ootle template semantics.
This is a product sketch for contest reviewers, not a formal audit. Engine/template proofs land in a later chunk.

## Actors

- **Organizer** — creates the poll, mints claim tickets, optionally funds a fee pool, closes after deadline.
- **Voter (ticket holder)** — receives a claim link/QR off-chain, claims a ballot credential, casts one sealed vote.
- **Observer** — reads public ledger / demo “chain view”: commitments, nullifiers, tallies — not ticket secrets.
- **Adversary** — tries double-vote, steal unused tickets, link votes to people, censor, or forge tallies.

## Goals

1. **Ballot secrecy** until reveal (and unlinkability of holder ↔ choice for observers without ticket secrets).
2. **One vote per ticket** via nullifier / key-image; double-cast rejected.
3. **Open enrollment** without a fixed pubkey roster (delta vs Séance).
4. **Verifiable tally** after close — anyone can recompute counts from revealed sealed ballots.
5. **Zero-balance claim path** (fee from ticket or sponsor pool) — reuse of Phantom Drop fee pattern, new purpose.

## Assets

| Asset | Sensitivity |
|---|---|
| Claim-ticket secret (link) | High — bearer credential; treat like a one-time password |
| Ballot credential after claim | High — authorizes cast |
| Sealed ballot ciphertext | Medium until reveal; public after close |
| Nullifier set | Public; must not link to holder without ticket secret |
| Organizer mint keys / fee pool | High |

## Threats & mitigations (MVP)

| Threat | Mitigation | Residual risk |
|---|---|---|
| Double vote | Nullifier recorded on cast; second cast fails | Soft fork / buggy client in sim only — engine enforces on-chain later |
| Ticket theft | Bearer links; organizer should DM/QR privately | Compromised DM/channel leaks unused tickets |
| Link vote → person | Separate domains for ticket commitment vs nullifier; choice sealed | Side channels (timing, fee payer) — document; sponsor pool helps |
| Organizer stuffing | Public ticket cap N; unused tickets can be audited as unclaimed | Malicious organizer can still mint to sockpuppets they control — social/governance limit |
| Premature peek | Sealed until close; sim encrypts choice with poll reveal key held until close | Sim reveal key is in-page — **demo only**; on-chain uses proper commit/reveal or threshold |
| Replay / double-claim | Ticket consumed on claim | Need engine-level UTXO spend for production |
| Censorship of casts | Out of scope for MVP (relies on network availability) | Same as other Ootle apps |

## Non-goals (MVP)

- KYC / on-chain identity
- Fixed ring signatures (Séance model)
- Weighting / quadratic voting
- Mainnet default deployment
- Protecting organizers who publicly post all unused ticket links

## Simulation honesty note

The Pages demo models commitments and nullifiers with Web Crypto SHA-256 and keeps sealed ballots in memory until close. It is **playable and pedagogically faithful**, not a substitute for `tari_template_test_tooling` proofs. Treat “What the chain sees” as the contract between product and reviewers.
