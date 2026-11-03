# QuietTicket toolchain notes

## Required for engine tests

- Rust **1.97.1** (`rust-toolchain.toml`) + target `wasm32-unknown-unknown`
- Crates.io: `tari_template_lib` **0.37**, `tari_template_test_tooling` **0.49**
- `cargo test` compiles the template to WASM via the test harness (first run is slow)

## Judge path without Rust

Open https://hycorange.github.io/quiet-ticket/ — walletless sim remains the submission demo.

## Known skew

Phantom Drop (`/workspace/tari-contest`) used native stealth + `ootle-rs` (no custom template).
QuietTicket adds a **custom `#[template]`** for ballot credential + sealed tally.
