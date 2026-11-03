# QuietTicket — Esmeralda / Sapient live path (plan only)

**Chunk decision (2026-11-03): document, do not deploy.**  
Live Esmeralda is **optional bonus** for t/520. Walletless Pages sim + engine tests already cover the MVP submission path (money hard constraint).

## What “live” would mean

| Mode | Goal | Dependency |
|---|---|---|
| **A. Template publish + txs** | Deploy `QuietTicket` wasm to Esmeralda; mint/claim/cast/close with explorer links | Ootle template publish tooling, funded Ootle account, fees |
| **B. Sapient browser** | “Live on Esmeralda” toggle beside the sim (`window.tari`) | Sapient extension, stable API, UI wiring not built yet |
| **C. Hybrid** | Engine tests (done) + one manual publish script + README proof table | Same as A, less UI |

## Cost / friction (from Phantom Drop `/workspace/tari-contest` experience)

Phantom’s `docs/ESMERALDA.md` + live run notes show the **testnet funding path is not zero-friction**:

| Route | Friction | Notes (Oct 2026 Phantom run) |
|---|---|---|
| Public Ootle faucet | Often broken / balance edge cases | Phantom: faucet stuck below fixed take |
| L1 burn Minotari → Ootle claim | Multi-hour / multi-tool | Needs L1 wallet, burn proof, `tari_ootle_walletd`, claim key hygiene (one Phantom burn was lost without claim key) |
| Mine L1 tXTM | CPU time + node sync | Documented but heavy for a ≤15 min chunk |
| Community faucet L1 then burn | Still operational ceremony | Worked for Phantom (2026-10-12) after setup |

QuietTicket-specific gaps vs Phantom:

1. **No Sapient / `window.tari` integration** in `site/` yet (sim-only).  
2. **No publish CLI / PROOF.md txs** for the new template.  
3. Template uses `AccessRules::allow_all()` MVP — fine for testnet demo, still needs a funded publisher and fee path.  
4. Fee-pool / zero-balance claim on **live** template is not wired (sim models it; Phantom proved the stealth fee pattern separately).

## Effort vs bonus

| Item | Est. effort | Bonus value for judges |
|---|---|---|
| Keep sim + engine 4/4 as primary proof | ✅ done | **Required path — sufficient** |
| Sapient live toggle + one happy-path poll | ~1–2 days after API check | High polish; fragile if Sapient moves |
| Template publish + 4 explorer links (create/mint/cast/tally) | ~0.5–1 day **after** funded Esmeralda account exists | Strong “runs on Ootle” evidence |
| Full fee-pool + zero-balance claim on live | +1 day (reuse Phantom patterns carefully — not a reskin) | Nice; not needed to submit |

**Recommendation:** submit on sim + engine green; only schedule Esmeralda if money wants the bonus **and** a funded testnet account is already available (no new Orange spend). Do not start L1 sync/mine inside a short chunk.

## Explicit non-actions this chunk

- No faucet claims, burns, mines, or mainnet.  
- No Sapient install / wallet signature.  
- No template publish.  
- No fee spending.

## If a future chunk gets green light

1. Confirm Esmeralda account balance (reuse Phantom tooling where possible; separate QuietTicket keys).  
2. Publish template → record template address.  
3. Script create → mint → claim → cast → double-reject → close/tally; paste explorer URLs into `PROOF.md` + Pages “Live” section.  
4. Keep Pages **sim** as default tab so faucet outages cannot brick the judge path.
