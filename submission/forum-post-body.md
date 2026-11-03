<!-- DRAFT reply for Tari forum t/520 November Build Contest.
     DO NOT POST until money OK. Prefer ≤5 outbound links if the account is still low trust. -->

## QuietTicket（静票）— claim-ticket silent voting on Tari Ootle

**Code (MIT):** https://github.com/hycorange/quiet-ticket  
**Play demo (no wallet):** https://hycorange.github.io/quiet-ticket/  
**Tari payment address:** 12AkA1PP1qJUYK48GnfnmjsRcMqkou8XTVjSxF3vjBtf8BbLmLQsAkKzYyCMMPEq4Hp4dQuEMHDTGGvwHMLE2L6QeWB  
**Announcement:** _(Bluesky / Medium link — posted by 悬赏比赛 after money OK; no X)_

**What it is**  
QuietTicket is a community silent-voting MVP: organizers mint one-time **claim tickets**, members claim a ballot credential (zero-balance path), cast a **sealed vote** with a nullifier so double-votes fail, then close and publish a verifiable tally. Chain observers see commitments and nullifiers — not who held which ticket or which option they chose before reveal.

**Why it is not a reskin**
- vs **Phantom Drop** (our October entry): money envelopes → **ballot credentials + sealed tally**
- vs **Séance**: fixed pubkey rings → **open claim-ticket enrollment** (no roster of 2–64 keys before the poll)

**What's included**
- Walletless browser simulation on GitHub Pages (create → mint → claim → cast → reject double vote → close / reveal / tally)
- Rust Ootle `#[template]` scaffold + in-process engine tests (`tari_template_test_tooling`, 4/4 green)
- Threat-model sketch and README deltas called out on the homepage
- MIT license

**Honesty notes**  
The default judge path is the **simulation** — no faucet, Sapient, or testnet fee required. A live Esmeralda / Sapient path is optional bonus evidence and is not claimed in this post unless/until we publish explorer links.

Feedback welcome — especially from Discord/DAO mods who need anonymous votes without collecting every pubkey first.
