(function () {
  const S = QuietTicketSim;
  const state = S.newEngine();

  const $ = (id) => document.getElementById(id);
  const phasePill = $("phasePill");
  const hint = $("hint");
  const logBox = $("logBox");
  const chainBox = $("chainBox");
  const ticketList = $("ticketList");
  const ticketSelect = $("ticketSelect");
  const choiceSelect = $("choiceSelect");
  const voterMsg = $("voterMsg");
  const tallyCard = $("tallyCard");
  const tallyBox = $("tallyBox");

  function setMsg(text, ok) {
    voterMsg.textContent = text || "";
    voterMsg.style.color = ok === false ? "var(--bad)" : ok ? "var(--ok)" : "var(--dim)";
  }

  function render() {
    const snap = S.snapshot(state);
    phasePill.textContent = snap.phase;
    phasePill.className = "pill " + (snap.phase === "open" ? "open" : snap.phase);

    const hints = {
      idle: "1) Create a poll → 2) Mint tickets → 3) Claim → 4) Cast → 5) Try double-vote → 6) Close & tally.",
      open: snap.tickets.length
        ? "Claim a minted ticket, cast a sealed vote, then try double-vote. Close when ready."
        : "Mint claim tickets next — secrets stay off-chain; only commitments are “on chain”.",
      closed: "Reveal & tally to open sealed ballots and publish counts.",
      tallied: "Done. Reset to run another silent vote. Compare with the chain panel.",
    };
    hint.textContent = hints[snap.phase] || hints.idle;

    $("btnMint").disabled = !(snap.phase === "open" && snap.tickets.length === 0 && snap.poll);
    $("btnClaim").disabled = !(snap.phase === "open" && snap.tickets.length);
    $("btnCast").disabled = !(snap.phase === "open" && snap.tickets.length);
    $("btnDouble").disabled = !(snap.phase === "open" && snap.tickets.some((t) => t.status === "voted"));
    $("btnClose").disabled = !(snap.phase === "open" && snap.ballots > 0);
    $("btnTally").disabled = !(snap.phase === "closed");
    ticketSelect.disabled = !snap.tickets.length;
    choiceSelect.disabled = !snap.poll;

    // ticket select
    const prev = ticketSelect.value;
    ticketSelect.innerHTML = "";
    snap.tickets.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.id} · ${t.status} · ${S.short(t.commitment, 8)}`;
      ticketSelect.appendChild(opt);
    });
    if ([...ticketSelect.options].some((o) => o.value === prev)) ticketSelect.value = prev;

    // choices
    choiceSelect.innerHTML = "";
    if (snap.poll) {
      snap.poll.options.forEach((label, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `${i}: ${label}`;
        choiceSelect.appendChild(opt);
      });
    }

    // ticket cards
    if (!snap.tickets.length) {
      ticketList.innerHTML = '<span class="dim">No tickets yet.</span>';
    } else {
      ticketList.innerHTML = snap.tickets
        .map(
          (t) => `<div class="ticket">
          <div><b>${t.id}</b> · <span class="status-${t.status}">${t.status}</span>
            · commitment <code>${S.short(t.commitment, 12)}</code></div>
          <div class="links">${t.claimLink}</div>
        </div>`
        )
        .join("");
    }

    // log
    logBox.innerHTML = snap.log
      .slice()
      .reverse()
      .map((e) => `<div class="${e.kind}">• ${e.msg}</div>`)
      .join("") || '<div class="info">—</div>';

    // chain
    chainBox.innerHTML = snap.chainView
      .slice()
      .reverse()
      .map((e) => {
        const vis = JSON.stringify(e.visible, null, 2);
        const hid = (e.hidden || []).map((h) => `❌ ${h}`).join(" · ") || "—";
        return `<div style="margin-bottom:10px">
          <div><b>${e.event}</b></div>
          <pre class="visible-tag">${vis}</pre>
          <div class="hidden-tag mono">${hid}</div>
        </div>`;
      })
      .join("") || '<p class="dim">No public events yet.</p>';

    // tally
    if (snap.tally) {
      tallyCard.hidden = false;
      const total = Math.max(1, snap.tally.total);
      tallyBox.innerHTML =
        snap.poll.options
          .map((o, i) => {
            const c = snap.tally.counts[i];
            const pct = Math.round((c / total) * 100);
            return `<div class="tally-bar"><div style="width:140px">${o}</div>
              <div class="bar" style="width:${Math.max(4, pct * 2)}px"></div>
              <b>${c}</b> <span class="dim">(${pct}%)</span></div>`;
          })
          .join("") +
        `<p class="dim">Total sealed ballots revealed: ${snap.tally.total}. Holders remain unlinkable without ticket secrets.</p>`;
    } else {
      tallyCard.hidden = true;
      tallyBox.innerHTML = "";
    }
  }

  async function wrap(fn) {
    try {
      await fn();
      setMsg("");
    } catch (e) {
      setMsg(e.message || String(e), false);
    }
    render();
  }

  $("btnCreate").onclick = () =>
    wrap(async () => {
      const options = $("options").value.split("\n");
      await S.createPoll(state, {
        question: $("question").value,
        options,
        ticketCount: $("ticketCount").value,
        deadlineLabel: $("deadline").value,
      });
      setMsg("Poll created. Mint tickets next.", true);
    });

  $("btnMint").onclick = () =>
    wrap(async () => {
      await S.mintTickets(state);
      setMsg(`Minted ${state.tickets.length} claim links. Pick a ticket and claim.`, true);
    });

  $("btnClaim").onclick = () =>
    wrap(async () => {
      const id = ticketSelect.value;
      await S.claimTicket(state, id);
      setMsg(`Claimed ${id}. You can cast a sealed vote.`, true);
    });

  $("btnCast").onclick = () =>
    wrap(async () => {
      const id = ticketSelect.value;
      const choice = Number(choiceSelect.value);
      await S.castVote(state, id, choice);
      setMsg(`Sealed vote recorded for ${id}. Try double vote to see rejection.`, true);
    });

  $("btnDouble").onclick = () =>
    wrap(async () => {
      const voted = state.tickets.find((t) => t.status === "voted");
      if (!voted) throw new Error("Cast at least one vote first.");
      ticketSelect.value = voted.id;
      await S.attemptDoubleVote(state, voted.id, Number(choiceSelect.value) || 0);
    });

  $("btnClose").onclick = () =>
    wrap(async () => {
      S.closePoll(state);
      setMsg("Poll closed. Reveal & tally when ready.", true);
    });

  $("btnTally").onclick = () =>
    wrap(async () => {
      S.revealAndTally(state);
      setMsg("Tally published.", true);
    });

  $("btnReset").onclick = () =>
    wrap(async () => {
      S.reset(state);
      setMsg("Reset.", true);
    });

  render();
})();
