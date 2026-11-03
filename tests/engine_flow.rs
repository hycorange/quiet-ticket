//! In-process Ootle engine tests for QuietTicket (`tari_template_test_tooling`).
//! Flow: create → mint → claim → cast → double-reject → close → tally.

use sha2::{Digest, Sha256};
use tari_ootle_transaction::args;
use tari_template_lib_types::{ComponentAddress, Hash32};
use tari_template_test_tooling::{
    TemplateTest,
    support::assert_error::assert_reject_reason,
};

fn sha256(parts: &[&[u8]]) -> Hash32 {
    let mut h = Sha256::new();
    for p in parts {
        h.update(p);
    }
    let out = h.finalize();
    Hash32::from(<[u8; 32]>::try_from(out.as_slice()).expect("32"))
}

fn poll_id() -> Hash32 {
    sha256(&[b"quietticket-test-poll"])
}

fn ticket_commit(poll: &Hash32, secret: &[u8]) -> Hash32 {
    sha256(&[b"qt:ticket:", poll.as_ref(), secret])
}

fn nullifier(poll: &Hash32, seed: &[u8]) -> Hash32 {
    sha256(&[b"qt:nullifier:", poll.as_ref(), seed])
}

fn reveal_commit(poll: &Hash32, key: &[u8]) -> Hash32 {
    sha256(&[b"qt:reveal:", poll.as_ref(), key])
}

fn setup() -> (TemplateTest, ComponentAddress, Hash32) {
    let mut test = TemplateTest::my_crate();
    let pid = poll_id();
    let reveal = reveal_commit(&pid, b"demo-reveal-key");
    let component: ComponentAddress = test.call_function(
        "QuietTicket",
        "create",
        args![
            pid,
            "Ship QuietTicket MVP?".to_string(),
            vec![
                "Yes".to_string(),
                "No".to_string(),
                "Abstain".to_string()
            ],
            5u32,
            0u64,
            reveal
        ],
        vec![],
    );
    (test, component, pid)
}

#[test]
fn create_mint_claim_cast_tally() {
    let (mut test, component, pid) = setup();

    let secrets: [&[u8]; 3] = [b"ticket-secret-0", b"ticket-secret-1", b"ticket-secret-2"];
    let commits: Vec<Hash32> = secrets.iter().map(|s| ticket_commit(&pid, s)).collect();

    let _: () = test.call_method(component, "mint_tickets", args![commits], vec![]);
    assert_eq!(
        test.call_method::<u32>(component, "ticket_count", args![], vec![]),
        3
    );

    let _: () = test.call_method(component, "claim", args![0u32, secrets[0].to_vec()], vec![]);
    assert!(test.call_method::<bool>(component, "is_claimed", args![0u32], vec![]));

    let nf0 = nullifier(&pid, b"nf-seed-0");
    let _: () = test.call_method(component, "cast", args![0u32, nf0, vec![0u8]], vec![]);

    let _: () = test.call_method(component, "claim", args![1u32, secrets[1].to_vec()], vec![]);
    let nf1 = nullifier(&pid, b"nf-seed-1");
    let _: () = test.call_method(component, "cast", args![1u32, nf1, vec![1u8]], vec![]);

    let _: () = test.call_method(component, "close", args![], vec![]);
    let tally: Vec<u32> = test.call_method(component, "reveal_and_tally", args![], vec![]);
    assert_eq!(tally, vec![1, 1, 0]);
    assert!(test.call_method::<bool>(component, "is_tallied", args![], vec![]));
}

#[test]
fn double_vote_rejected() {
    let (mut test, component, pid) = setup();
    let secret = b"ticket-secret-dup";
    let commits = vec![ticket_commit(&pid, secret)];
    let _: () = test.call_method(component, "mint_tickets", args![commits], vec![]);
    let _: () = test.call_method(component, "claim", args![0u32, secret.to_vec()], vec![]);

    let nf = nullifier(&pid, b"same-nf");
    let _: () = test.call_method(component, "cast", args![0u32, nf, vec![0u8]], vec![]);

    let reason = test.execute_expect_failure(
        test.transaction()
            .call_method(component, "cast", args![0u32, nf, vec![1u8]])
            .build_and_seal(test.secret_key()),
        vec![],
    );
    assert_reject_reason(reason, "ticket already voted");
}

#[test]
fn bad_ticket_secret_rejected() {
    let (mut test, component, pid) = setup();
    let commits = vec![ticket_commit(&pid, b"real-secret")];
    let _: () = test.call_method(component, "mint_tickets", args![commits], vec![]);

    let reason = test.execute_expect_failure(
        test.transaction()
            .call_method(component, "claim", args![0u32, b"wrong-secret".to_vec()])
            .build_and_seal(test.secret_key()),
        vec![],
    );
    assert_reject_reason(reason, "ticket secret does not match commitment");
}

#[test]
fn domain_tags_match_sim_prefix() {
    assert_eq!(quiet_ticket::domain::TAG_TICKET, b"qt:ticket:");
    assert_eq!(quiet_ticket::domain::TAG_NULLIFIER, b"qt:nullifier:");
    assert_eq!(quiet_ticket::domain::TAG_REVEAL, b"qt:reveal:");
}
