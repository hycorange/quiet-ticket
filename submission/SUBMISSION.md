# QuietTicket（静票）— Tari t/520 submission pack

> **STATUS: DRAFT ONLY — do not post to the forum until money OK.**  
> Contest thread: Tari community forum **t/520** (November Build Contest)  
> Author / pseudonym: **hycorange / Orange Soda**  
> Deadline: **2026-12-01 00:00 UTC** (= 12-01 09:00 JST)  
> Do **not** touch **t/521**. No KYC, no Orange money, no wallet signature required for the default demo.

---

## Paste-ready fields (forum reply)

| Field | Value |
|---|---|
| **Project name** | QuietTicket（静票） |
| **One-liner** | Claim-ticket silent voting for Tari Ootle — mint ballot links, cast sealed votes, verifiable tally; no pubkey roster. |
| **Public repo** | https://github.com/hycorange/quiet-ticket |
| **MVP demo** | https://hycorange.github.io/quiet-ticket/ (walletless browser sim) |
| **CI** | https://github.com/hycorange/quiet-ticket/actions |
| **License** | MIT |
| **Tari payout address (TEXT)** | `12AkA1PP1qJUYK48GnfnmjsRcMqkou8XTVjSxF3vjBtf8BbLmLQsAkKzYyCMMPEq4Hp4dQuEMHDTGGvwHMLE2L6QeWB` |
| **Social announce** | Bluesky and/or Medium via **悬赏比赛** after money green-lights copy — **no X** this contest month. Draft: `submission/SOCIAL-DRAFT.md`. Not posted yet. |

---

## Description (for the forum post body)

QuietTicket turns Tari Ootle stealth claim-link DNA into a **governance primitive**: organizers mint one-time **claim tickets** (DM / QR), holders claim a ballot credential with zero balance, cast a **sealed vote** protected by a nullifier, and after close the tally is publicly verifiable.

**Delta vs past work (anti-reskin):**
- vs **Phantom Drop**: money envelopes → **ballot credentials + sealed tally**
- vs **Séance**: fixed pubkey rings → **open claim-ticket enrollment** (no key roster up front)

Judges can finish the whole flow in ~3 minutes on Pages with **no wallet, faucet, or signup**. Optional Esmeralda / Sapient live is bonus evidence, not required for the MVP path (see `docs/ESMERALDA-PLAN.md`).

---

## Deliverables checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | Public GitHub repo (MIT) | ✅ https://github.com/hycorange/quiet-ticket |
| 2 | MVP link (playable) | ✅ https://hycorange.github.io/quiet-ticket/ |
| 3 | Walletless sim: create → mint → claim → cast → reject double → close/tally | ✅ `site/` |
| 4 | README deltas (Phantom Drop / Séance) on homepage | ✅ |
| 5 | Threat-model sketch | ✅ `docs/THREAT-MODEL.md` |
| 6 | Rust Ootle `#[template]` scaffold | ✅ `src/lib.rs` |
| 7 | Engine tests (`tari_template_test_tooling`) | ✅ 4/4 green (`tests/engine_flow.rs`) |
| 8 | Tari payout address in submission materials | ✅ this file + forum draft |
| 9 | Social announce (Bluesky / Medium; **no X**) | ⏳ draft in `SOCIAL-DRAFT.md` — 悬赏比赛 posts after money OK |
| 10 | Forum reply on t/520 | ⏳ **blocked on money OK** — body in `forum-post-body.md` |
| 11 | Esmeralda / Sapient live txs | ⏳ optional bonus — plan only (`docs/ESMERALDA-PLAN.md`); not attempted this chunk |

---

## How judges should click

1. Open https://hycorange.github.io/quiet-ticket/
2. Create a poll → Mint claim tickets → Claim → Cast sealed vote
3. Try **double vote** → rejected (nullifier spent)
4. Close → Reveal & tally; skim “What the chain sees”
5. Optional: `cargo test` in the repo (engine 4/4); read `docs/THREAT-MODEL.md`

Local fallback: `python3 -m http.server --directory site` or open `site/index.html`.

---

## Gate before posting

- [ ] money approves forum body (`forum-post-body.md`)
- [ ] money / 悬赏比赛 schedule Bluesky or Medium from `SOCIAL-DRAFT.md` (hycorange; no AI reveal; no X)
- [ ] Confirm Pages + repo still 200
- [ ] Do **not** ask 悬赏比赛 until money green-lights
- [ ] Still no t/521, mainnet, or paid fees for MVP submit

## Payout address (TEXT — not a secret)

```
12AkA1PP1qJUYK48GnfnmjsRcMqkou8XTVjSxF3vjBtf8BbLmLQsAkKzYyCMMPEq4Hp4dQuEMHDTGGvwHMLE2L6QeWB
```
