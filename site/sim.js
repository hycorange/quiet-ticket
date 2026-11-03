/**
 * QuietTicket walletless simulation engine.
 * Browser-only: SHA-256 commitments, ticket secrets, sealed ballots, nullifiers.
 * Pedagogically faithful to the intended Ootle flow — not a chain proof.
 */
(function (global) {
  "use strict";

  const enc = new TextEncoder();

  async function sha256Hex(data) {
    const buf = typeof data === "string" ? enc.encode(data) : data;
    const dig = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }

  function b64url(bytes) {
    let s = btoa(String.fromCharCode(...bytes));
    return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function short(hex, n = 10) {
    return hex.slice(0, n) + "…" + hex.slice(-4);
  }

  /** Simple XOR "seal" for demo (key = revealKey). Not crypto for production. */
  function sealChoice(choiceIndex, revealKeyHex) {
    const key = enc.encode(revealKeyHex.slice(0, 32).padEnd(32, "0"));
    const payload = enc.encode(String(choiceIndex));
    const out = new Uint8Array(payload.length);
    for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ key[i % key.length];
    return b64url(out);
  }

  function unsealChoice(sealedB64, revealKeyHex) {
    const pad = sealedB64.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(pad + "===".slice((pad.length + 3) % 4));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const key = enc.encode(revealKeyHex.slice(0, 32).padEnd(32, "0"));
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ key[i % key.length];
    return parseInt(new TextDecoder().decode(out), 10);
  }

  function newEngine() {
    return {
      phase: "idle", // idle | open | closed | tallied
      poll: null,
      tickets: [], // { id, secret, commitment, status: minted|claimed|voted, claimLink }
      credentials: {}, // ticketId -> { credentialId, nullifierSeed }
      nullifiers: new Set(),
      ballots: [], // { nullifier, sealed, ticketId }
      tally: null,
      log: [],
      chainView: [],
    };
  }

  function log(state, msg, kind = "info") {
    state.log.push({ t: Date.now(), msg, kind });
  }

  function pushChain(state, entry) {
    state.chainView.push({ t: Date.now(), ...entry });
  }

  async function createPoll(state, { question, options, ticketCount, deadlineLabel }) {
    if (state.phase !== "idle" && state.phase !== "tallied") {
      throw new Error("Finish or reset the current poll first.");
    }
    const opts = (options || []).map((o) => String(o).trim()).filter(Boolean);
    if (!question || opts.length < 2 || opts.length > 6) {
      throw new Error("Need a question and 2–6 options.");
    }
    const n = Math.max(1, Math.min(64, Number(ticketCount) || 5));
    const revealKey = await sha256Hex(randomBytes(32));
    const pollId = (await sha256Hex(enc.encode("poll:" + question + ":" + Date.now()))).slice(0, 16);

    state.poll = {
      pollId,
      question: String(question).trim(),
      options: opts,
      ticketCount: n,
      deadlineLabel: deadlineLabel || "demo-epoch+1",
      revealKey,
      createdAt: Date.now(),
    };
    state.tickets = [];
    state.credentials = {};
    state.nullifiers = new Set();
    state.ballots = [];
    state.tally = null;
    state.phase = "open";
    state.chainView = [];
    state.log = [];

    log(state, `Poll ${pollId} created · ${opts.length} options · cap ${n} tickets`, "ok");
    pushChain(state, {
      event: "poll_created",
      visible: {
        pollId,
        optionCount: opts.length,
        ticketCap: n,
        deadline: state.poll.deadlineLabel,
      },
      hidden: ["holder identities", "future choices", "ticket secrets", "reveal key"],
    });
    return state.poll;
  }

  async function mintTickets(state) {
    if (!state.poll || state.phase !== "open") throw new Error("No open poll.");
    if (state.tickets.length) throw new Error("Tickets already minted for this poll.");

    const n = state.poll.ticketCount;
    for (let i = 0; i < n; i++) {
      const secretBytes = randomBytes(24);
      const secret = b64url(secretBytes);
      const commitment = await sha256Hex(`qt:ticket:${state.poll.pollId}:${secret}`);
      const id = `t${i}`;
      const claimLink = `quietticket:${state.poll.pollId}:${secret}`;
      state.tickets.push({
        id,
        index: i,
        secret,
        commitment,
        status: "minted",
        claimLink,
      });
      pushChain(state, {
        event: "ticket_minted",
        visible: { ticketIndex: i, commitment: short(commitment, 12) },
        hidden: ["claim secret / link", "holder"],
      });
    }
    log(state, `Minted ${n} claim tickets (commitments on “chain”, secrets off-chain)`, "ok");
    return state.tickets;
  }

  async function claimTicket(state, ticketId) {
    if (state.phase !== "open") throw new Error("Poll is not open.");
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error("Unknown ticket.");
    if (ticket.status !== "minted") throw new Error(`Ticket ${ticketId} already ${ticket.status}.`);

    const nullifierSeed = await sha256Hex(`qt:nfseed:${state.poll.pollId}:${ticket.secret}`);
    const credentialId = (await sha256Hex(`qt:cred:${nullifierSeed}`)).slice(0, 20);
    ticket.status = "claimed";
    state.credentials[ticket.id] = { credentialId, nullifierSeed, claimedAt: Date.now() };

    log(state, `Claimed ${ticketId} → ballot credential ${credentialId.slice(0, 8)}… (zero-balance path)`, "ok");
    pushChain(state, {
      event: "ticket_claimed",
      visible: {
        ticketCommitment: short(ticket.commitment, 12),
        credentialCommitment: short(credentialId, 10),
        feePath: "sponsor-pool / ticket self-pay (sim)",
      },
      hidden: ["who claimed", "nullifier seed", "link secret"],
    });
    return state.credentials[ticket.id];
  }

  async function castVote(state, ticketId, choiceIndex) {
    if (state.phase !== "open") throw new Error("Poll is not open for casting.");
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error("Unknown ticket.");
    if (ticket.status === "minted") throw new Error("Claim the ticket before voting.");
    if (ticket.status === "voted") throw new Error("Already voted with this ticket.");

    const cred = state.credentials[ticketId];
    if (!cred) throw new Error("No credential — claim first.");

    const choice = Number(choiceIndex);
    if (!Number.isInteger(choice) || choice < 0 || choice >= state.poll.options.length) {
      throw new Error("Invalid option index.");
    }

    const nullifier = await sha256Hex(`qt:nullifier:${state.poll.pollId}:${cred.nullifierSeed}`);
    if (state.nullifiers.has(nullifier)) {
      const err = new Error("REJECTED: nullifier already spent (double vote).");
      err.code = "DOUBLE_VOTE";
      log(state, err.message, "bad");
      pushChain(state, {
        event: "cast_rejected",
        visible: { nullifier: short(nullifier, 12), reason: "nullifier_spent" },
        hidden: ["choice", "holder"],
      });
      throw err;
    }

    const sealed = sealChoice(choice, state.poll.revealKey);
    state.nullifiers.add(nullifier);
    ticket.status = "voted";
    state.ballots.push({ nullifier, sealed, ticketId, castAt: Date.now() });

    log(state, `Sealed vote cast from ${ticketId} · nullifier ${short(nullifier, 10)}`, "ok");
    pushChain(state, {
      event: "ballot_cast",
      visible: {
        nullifier: short(nullifier, 12),
        sealedBallot: sealed.slice(0, 18) + "…",
      },
      hidden: ["plain choice", "holder identity", "ticket secret"],
    });
    return { nullifier, sealed };
  }

  /** Attempt a second cast to demonstrate rejection (uses same ticket). */
  async function attemptDoubleVote(state, ticketId, choiceIndex) {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status !== "voted") {
      throw new Error("Need a ticket that already voted to demo double-vote rejection.");
    }
    // Temporarily mark as claimed so castVote path hits nullifier check after we restore
    const cred = state.credentials[ticketId];
    const nullifier = await sha256Hex(`qt:nullifier:${state.poll.pollId}:${cred.nullifierSeed}`);
    if (state.nullifiers.has(nullifier)) {
      const err = new Error("REJECTED: nullifier already spent (double vote).");
      err.code = "DOUBLE_VOTE";
      log(state, err.message, "bad");
      pushChain(state, {
        event: "cast_rejected",
        visible: { nullifier: short(nullifier, 12), reason: "nullifier_spent" },
        hidden: ["choice", "holder"],
      });
      throw err;
    }
    // unreachable if status voted
    return castVote(state, ticketId, choiceIndex);
  }

  function closePoll(state) {
    if (state.phase !== "open") throw new Error("Poll is not open.");
    state.phase = "closed";
    log(state, "Poll closed — reveal key unlocked for tally", "ok");
    pushChain(state, {
      event: "poll_closed",
      visible: { status: "closed", ballots: state.ballots.length },
      hidden: [],
    });
  }

  function revealAndTally(state) {
    if (state.phase !== "closed" && state.phase !== "tallied") {
      throw new Error("Close the poll before tally.");
    }
    const counts = state.poll.options.map(() => 0);
    const revealed = [];
    for (const b of state.ballots) {
      const choice = unsealChoice(b.sealed, state.poll.revealKey);
      if (choice >= 0 && choice < counts.length) counts[choice]++;
      revealed.push({ nullifier: short(b.nullifier, 10), choice, label: state.poll.options[choice] });
    }
    state.tally = { counts, revealed, total: state.ballots.length };
    state.phase = "tallied";
    log(
      state,
      `Tally: ` + state.poll.options.map((o, i) => `${o}=${counts[i]}`).join(" · "),
      "ok"
    );
    pushChain(state, {
      event: "tally_revealed",
      visible: {
        counts: Object.fromEntries(state.poll.options.map((o, i) => [o, counts[i]])),
        totalBallots: state.ballots.length,
      },
      hidden: ["still no holder identities"],
    });
    return state.tally;
  }

  function reset(state) {
    const fresh = newEngine();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    log(state, "Simulation reset", "info");
  }

  function snapshot(state) {
    return {
      phase: state.phase,
      poll: state.poll
        ? {
            pollId: state.poll.pollId,
            question: state.poll.question,
            options: state.poll.options.slice(),
            ticketCount: state.poll.ticketCount,
            deadlineLabel: state.poll.deadlineLabel,
          }
        : null,
      tickets: state.tickets.map((t) => ({
        id: t.id,
        index: t.index,
        commitment: t.commitment,
        status: t.status,
        claimLink: t.claimLink,
      })),
      ballots: state.ballots.length,
      nullifiers: state.nullifiers.size,
      tally: state.tally,
      log: state.log.slice(-40),
      chainView: state.chainView.slice(),
    };
  }

  global.QuietTicketSim = {
    newEngine,
    createPoll,
    mintTickets,
    claimTicket,
    castVote,
    attemptDoubleVote,
    closePoll,
    revealAndTally,
    reset,
    snapshot,
    short,
  };
})(typeof window !== "undefined" ? window : globalThis);
