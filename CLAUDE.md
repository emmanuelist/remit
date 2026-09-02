# Remit — build rules and pinned context

An agent gets exactly the authority its owners signed — byte for byte.

Remit is the proposal layer between an AI agent and a Safe multisig treasury. The agent
composes a treasury action; the owners review and sign it in Safe{Wallet}; KeeperHub
executes the exact approved calldata. The agent never holds a key.

Product canon lives in `internal/PRD.md` (gitignored). The seam between the frontend and
every external service is documented in `DATA_CONTRACTS.md` — read it before designing any
route handler. Phases and current position live in `AGENT_PROGRESS.md`.

## Repo layout

```
app/                  Next App Router — routes and the review surface
app/globals.css       design tokens. AUTHORITATIVE. Supersedes any palette in the PRD.
components/           UI primitives + the Remit card (the signature component)
lib/keeperhub/        KeeperHub seam — MCP tool calls and REST client
lib/safe/             Safe seam — Transaction Service client, on-chain reads via viem
lib/db/               drizzle schema, migrations, generated types
lib/identity.ts       the byte-identity proof: signed calldata vs executed calldata
scripts/              demo video pipeline (phase 7, copied from ~/Documents/hackathons/cleave)
internal/             PRD + hackathon strategy — gitignored, never commit
tests/                vitest; failure paths first
```

Run everything from the root: `npm run dev`, `build`, `lint`, `typecheck`, `test`.

## Pinned versions

Resolved from the npm registry on 2026-09-02. Do not "upgrade" these from memory.

| | |
|---|---|
| Node | >= 22 |
| npm | bundled with Node 26. The KeeperHub fork at phase 6 uses pnpm — that is their repo, not this one. |
| Next | 16.3.4 — **Next 14 and 15 idioms are stale here; do not write them** |
| React | 19.2.8 |
| TypeScript | 7.0.2 — **the Go-based compiler, not the 5.x JS one** |
| Tailwind | 4.3.3 — CSS-first config in `globals.css`. **No `tailwind.config.js`.** |
| viem | 2.56.2 |
| drizzle-orm | 0.45.2 |
| zod | 4.5.4 |
| @safe-global/api-kit | 5.0.3 |
| @safe-global/protocol-kit | 8.0.6 |
| Biome | linter + formatter, matching KeeperHub's own toolchain |

**zod version boundary.** `@keeperhub/sdk@0.1.1` depends on `zod@^3`. This app uses zod 4.
Never pass a zod schema instance across that boundary — plain objects only. Two zod majors
coexisting is fine; two zod majors sharing a schema instance is not.

## Rules

1. **No mocks, no fake data, no demo mode.** Every rendered value comes from a real source.
   Authoritative sources, by field:
   - owners, threshold, nonce, module state — **the chain**, read through KeeperHub
   - pending transactions and confirmations — **the Safe Transaction Service**
   - execution status, gas, retries, audit trail — **KeeperHub run records**
   - agent intent and composed calldata — **our Postgres**, written before proposing
   If a value has no real source yet, the UI shows its empty state. It does not invent one.
2. **Verify every SDK call against installed types** (`node_modules/<pkg>/**/*.d.ts`) or
   official docs before writing it. If a method cannot be verified, stop and say so.
   Hallucinated SDK surfaces are the most expensive failure mode in this build.
3. **Phase-gated.** Build the current phase only, then stop for confirmation.
4. **Every write persists, and the response returns the persisted row** — never an object
   constructed in memory.
5. **Tests cover failure paths.** Specifically: a proposal that never reaches threshold, a
   confirmation that arrives after expiry, an execution that reverts, a stuck nonce, and a
   proposal whose executed calldata does not match what was signed. That last one must be
   impossible to miss — it is the product's entire claim.
6. **No secrets in the repo.** Env vars only; blank-valued keys in `.env.example`.
   Never commit a Safe API key, a KeeperHub `kh_` key, or a private key.
7. **Never scope-cut silently.** Present tradeoffs on technical merit — trust model, attack
   surface, failure behaviour — not on time or effort.
8. **The scripted owner keys are Sepolia-only.** `SAFE_OWNER_B/C_PRIVATE_KEY` exist so the
   demo can collect signatures without driving a browser extension. They must never hold
   mainnet value, never be reused anywhere else, and never leave `.env.local`. If a mainnet
   Safe is ever created, its owners are hardware or browser wallets — not these.
9. **Testnet by default, mainnet deliberately.** Sepolia for all development. Exactly one
   mainnet execution, made consciously, to satisfy the submission's transaction link.

## The claim, and what defends it

The identity check in `lib/identity.ts` is the product. It compares the calldata the owners
signed (derived from the `safeTxHash` preimage) against the calldata that actually executed
on chain. Every other screen is setup for that one row.

Consequences:
- The signed payload is stored **before** it is proposed, never reconstructed afterwards.
- Verification reads the executed transaction from the chain, not from our own record of it.
- If the two ever disagree, the UI says so loudly. A product that only renders success is
  not evidence of anything.

## Frontend conventions

- Design direction is **instrument** — a document you sign, not a dashboard you watch.
  Dense, high-contrast, hairline rules, no shadowed cards, no gradients. Data is mostly
  hashes, addresses and calldata, so monospace carries the weight.
- Tokens live in `app/globals.css` and that file is authoritative. Names are
  product-flavoured, never `gray-100`: `--paper`, `--ink`, `--ink-quiet`, `--rule`,
  `--seal` (the single accent, used only on the identity verdict), `--assent`, `--void`.
- Fonts via `next/font` only. **Never add `<link>` tags to font CDNs.**
  Newsreader for prose, IBM Plex Sans for UI, IBM Plex Mono for every hash and address.
- No styled component library. Radix primitives for behaviour where a dialog or popover is
  genuinely needed; the visual layer is ours. MUI, Chakra, Ant, daisyUI and prefab block
  kits are prohibited — they would put this in the same bucket as thirty other entries.
- Every animation checks `prefers-reduced-motion`; timelines are killed on cleanup.
- Async calls wrap in `try/catch` with a shared error component. A failure must never
  strand a flow in a terminal in-flight state.
- **Stable selectors.** Every element the demo video points at carries a `data-shot`
  attribute. The film pipeline targets `data-shot`, never a Tailwind class, so restyling
  cannot silently break the video.
- Money is a string in minor units at every boundary. Never a float, never on-chain.

## Verification before any gate

```bash
npm run lint       # zero warnings
npm run typecheck
npm run build
npm run test
```

All four green, or the phase is not closed.
