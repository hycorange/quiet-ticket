# QuietTicket（静票）

**Delta vs Phantom Drop:** money envelopes become **ballot credentials + sealed tally** — same stealth claim-link DNA, new governance primitive.  
**Delta vs Séance:** fixed pubkey rings (2–64 keys up front) become **open claim-ticket enrollment** — organizers mint N tickets and hand out links; no key roster required.  
**Why it matters:** Discord/DAO mods can run a silent vote today by DM/QR without collecting every member’s pubkey first.

[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-0ea5e9)](https://hycorange.github.io/quiet-ticket/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Play the walletless simulation:** <https://hycorange.github.io/quiet-ticket/>  
(or open `site/index.html` locally — no wallet, no faucet, no signup)

Repository: <https://github.com/hycorange/quiet-ticket>

QuietTicket is a **community silent-voting MVP for Tari Ootle**: organizers mint one-time **claim tickets**, holders claim a ballot credential with zero balance, cast a **sealed vote** (nullifier / key-image), and after close the tally is publicly verifiable. Chain observers see commitments and nullifiers — not who held which ticket or which option they chose.

Built for the Tari **November Build Contest** (forum `t/520`). Pseudonym: **hycorange / Orange Soda**.

## Demo path (judges — ~3 minutes)

1. Open the Pages demo → **Play demo (no wallet)**.
2. Create a poll → mint N claim tickets → claim as a voter → cast a sealed vote.
3. Try to vote again with the same ticket → **rejected** (nullifier spent).
4. Close / reveal / tally → public counts; “What the chain sees” panel stays honest.
5. Optional later: Live on Esmeralda via Sapient (`window.tari`) — bonus, not required for this MVP path.

## How to run locally

```bash
git clone https://github.com/hycorange/quiet-ticket.git
cd quiet-ticket
# any static server, or just open the file:
python3 -m http.server 8080 --directory site
# then visit http://127.0.0.1:8080/
```

The simulation engine lives in `site/sim.js` (browser-only: SHA-256 commitments, nullifiers, sealed ballots). No Node, no Rust toolchain required for the demo path.

## Architecture (MVP)

| Layer | Role |
|---|---|
| Claim tickets | One-time secret links (QR / DM). On-chain: commitment / condition root only — no holder identity. |
| Ballot credential | Issued on claim; fee path designed for sponsor pool or ticket self-pay (Phantom Drop pattern). |
| Sealed cast | Option ciphertext + nullifier. Second cast with same nullifier fails. |
| Close / reveal / tally | After deadline: open sealed ballots, publish verifiable counts. |
| Sim demo | Full flow offline in the browser. |
| Ootle template | Rust `tari_template_lib` wasm (`src/lib.rs`) + `tests/engine_flow.rs` via `tari_template_test_tooling`. |

```
organizer ──mint──▶  N claim tickets (links / QR)
                         │
            ticket:qt1…  │  (shared off-chain: DM, channel, paper)
                         ▼
              claim  →  ballot credential (zero-balance path)
                         │
                         ▼
              cast   →  sealed ballot + nullifier   (double-cast rejected)
                         │
              close  →  reveal / tally (public counts)
```

## What the chain sees (sketch)

| Field | Visible? |
|---|---|
| Poll question / options metadata | Yes (or committed hash — product choice) |
| Ticket holder identity | ❌ Hidden — only ticket commitment / root |
| Ballot choice before reveal | ❌ Sealed |
| Nullifier (spent ticket) | Yes — proves one-vote without linking to holder without the ticket secret |
| Final tally | Yes — after close/reveal |

See [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md).

## Status

- [x] Walletless browser simulation (create → mint → claim → cast → reject double → close/tally)
- [x] README delta lines, MIT, threat-model sketch, Pages workflow
- [x] Rust Ootle `#[template]` scaffold (`src/lib.rs`) + domain tags + engine test stubs (`tests/engine_flow.rs`)
- [ ] Sapient / Esmeralda live path (optional bonus)
- [ ] Forum submission pack + Bluesky/Medium announce (via 悬赏比赛; no X)

### Rust / engine

```bash
rustup show   # expects 1.97.1 + wasm32-unknown-unknown
cargo test    # TemplateTest compiles template wasm; see docs/TOOLCHAIN.md
```

## License

MIT — see [LICENSE](LICENSE).
