# Phases

One phase at a time. Stop at each gate and confirm. A gate is closed only when
`npm run lint && npm run typecheck && npm run build && npm run test` are all green.

Build window: **Sep 6 10:00 UTC → Sep 18 10:00 UTC**. Phase 0 must be finished before it opens.

---

- [ ] **Phase 0 — rig** *(before Sep 6, does not consume build days)*
  Repo, pins, tokens, Biome, CI, deploy pipeline live on a real URL.
  External accounts, all of which have unknown latency and must be started now:
  - Safe API key — developer.safe.global → API Keys
  - KeeperHub org + `kh_` API key — app.keeperhub.com → Settings → Developer
  - DoraHacks registration for `agent-economy`
  - A Safe deployed on Sepolia with known owner keys and threshold 2-of-3
  Gate: the deployed URL renders an empty state against real, empty data.

  Done: repo public at https://github.com/emmanuelist/remit, pins verified against the
  registry, design tokens, CI green on GitHub Actions running all four gates,
  Safe API key, both `kh_` keys held locally,
  Safe `0xA4A12cCA345853A041C423fcA45Eb991B0FbAD11` (Sepolia, 2-of-3, v1.4.1, 20 USDC),
  deployed to https://remit-pied.vercel.app.
  Remaining: DoraHacks registration; `SAFE_API_KEY` and `KEEPERHUB_API_KEY_READ` on Vercel.
  `KEEPERHUB_API_KEY_WRITE` is deliberately held back until phase 4 — the deployed site has
  no auth, and a write-capable credential on it before the execute path exists and is gated
  buys nothing but risk.

  **Three URLs exist and only one is public.** `remit-pied.vercel.app` serves anonymously;
  the deployment URL and `remit-emmanuel-pauls-projects.vercel.app` sit behind Vercel SSO
  and show a login page to anyone who is not the owner. Only the public one goes in the
  README, the submission form, or the demo.

- [x] **Phase 1 — read path** — done 2026-09-02
  KeeperHub MCP connected. Read a real Safe's owners, threshold, nonce and pending queue
  through KeeperHub, not through our own RPC. Render them.
  Gate: every number on screen provably came from KeeperHub.

- [~] **Phase 2 — propose path** — mechanism done, composer still deterministic
  A real proposal is in the Safe's queue: `0x4d324cd7…1ccb`, `transfer()`, nonce 0,
  1 of 2 confirmations, 68 bytes of calldata, intent carried in `origin`.
  Composed by `deterministic/erc20-transfer@1`. The LLM composer slots in behind the same
  interface — deliberately second, so the byte-identity path is proven before a
  probabilistic composer touches it. **Needs `ANTHROPIC_API_KEY`.**
  Gate: a proposal made here is visible in Safe{Wallet} and in `get-pending-transactions`.

- [ ] **Phase 3 — the Remit card**
  The signature component. Intent, calldata, dry run, `safeTxHash`, signatures collected,
  and the identity row. All eight states from `DESIGN.md` built in this pass, not bolted on
  later: composed, proposed, refused, expired, executing, executed, failed, mismatch.
  Gate: every state renders from real data or its honest empty state; `data-shot` present
  on each element the film points at.

- [ ] **Phase 4 — execute path**
  Threshold met → KeeperHub executes the approved calldata via `execute_contract_call` →
  transaction hash → identity verified against the chain.
  Gate: **a real transaction executed through KeeperHub.** This is a submission requirement.
  Capture the link the moment it exists; do not leave it to deadline day.

- [ ] **Phase 5 — the non-happy path**
  Policy refusal, expiry, revert, stuck nonce, retry and gas escalation, audit trail
  surfaced. Rubric line 3 is explicitly about this, and almost no entrant will film it.
  Gate: a refused proposal and a failed execution both render honestly.

- [ ] **Phase 6 — bounty PR** *(separate BUIDL)*
  `execTransaction`, `execTransactionFromModule`, `approveHash` as first-class write actions
  in `protocols/safe.ts`, following `protocols/aave-v3.ts`, with tests.
  The `ApproveHash` event trigger already exists with no write to produce it — close that
  asymmetry. Fallback if it proves larger than estimated: issues `#1959` and `#1932`, both
  already labelled `accepted, confirmed`.
  Gate: PR open against `staging`, CI green, description references the issue it closes.

- [ ] **Phase 7 — proof surface**
  README as verification surface, demo video, both BUIDL submissions.
  Gate: `/hackathon preflight` clean.
