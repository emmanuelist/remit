# This is NOT the stack you know

Resolved from the npm registry on 2026-09-02. If your instinct disagrees with this table,
your instinct is stale. Read the installed types before writing the call.

- **Next 16.3.4.** Not 14, not 15. Do not reach for idioms you remember from those majors
  without checking them against `node_modules/next/types/**`.
- **TypeScript 7.0.2.** This is the Go-based compiler, a rewrite — not TypeScript 5.x.
  Flags, diagnostics and performance characteristics differ. Check before assuming.
- **Tailwind 4.3.3.** CSS-first configuration. There is no `tailwind.config.js` and there
  must never be one. Theme lives in `@theme` inside `app/globals.css`.
- **React 19.2.8.** Server Components are the default. `use client` is a deliberate choice
  that needs a reason, not a reflex.
- **zod 4.5.4** in app code, **zod 3** inside `@keeperhub/sdk`. Plain objects across that
  boundary, never schema instances.

## KeeperHub surfaces — verify, do not assume

KeeperHub's Safe protocol integration is **read-only today**: `getOwners`, `getThreshold`,
`isOwner`, `nonce`, `isModuleEnabled`, `getModulesPaginated`, plus event triggers
(`ExecutionSuccess`, `ExecutionFailure`, `ApproveHash`, `EnabledModule`, `AddedOwner`,
`ChangedThreshold`), plus one off-chain action, `get-pending-transactions`, which reads the
Safe Transaction Service and needs a Safe API key.

There is **no** `execTransaction`, `execTransactionFromModule` or `approveHash` write
action. Executing a Safe transaction therefore goes through the generic
`execute_contract_call` MCP tool for now. Closing that gap is the bounty PR — see
`AGENT_PROGRESS.md` phase 6.

Confirmed against `KeeperHub/keeperhub@staging` on 2026-09-02:
`protocols/safe.ts`, `plugins/safe/index.ts`, `lib/protocol-registry.ts`.

Write actions in that registry are declared `type: "write"`, route to
`stepImportPath: "protocol-write"`, require `web3` credentials, and automatically receive
private-mempool variants (`showPrivateVariants: true`). `protocols/aave-v3.ts` is the
working in-repo template to follow.

## API key scopes — verified from source, not inferred

`lib/mcp/oauth-scopes.ts` in `KeeperHub/keeperhub@staging`, read 2026-09-02.

Three scopes exist: `mcp:read`, `mcp:write`, `mcp:admin`.

- `READ_TOOLS` covers `list_workflows`, `get_workflow`, `get_execution`,
  `get_execution_status`, `get_execution_logs`, `list_executions`, `list_integrations`,
  `get_wallet_integration`, `get_direct_execution_status`, `validate_workflow`,
  `search_protocol_actions`, `get_spending_limits`.
- `WRITE_TOOLS` is a superset that adds `execute_contract_call`, `execute_transfer`,
  `execute_protocol_action`, `execute_check_and_execute`, `create_workflow`,
  `update_workflow`, `execute_workflow`, `call_workflow`, the marketplace and Tempo tools.
- `mcp:admin` is not a set of extra tools. `isToolAllowed` short-circuits to `return true`.
  It removes the gate. Remit needs nothing it grants.

Two hard facts from `docs/api/api-keys.md`:

1. **Omitting `scopes` at creation means no restriction — the key passes every gate.**
   Always select scopes explicitly.
2. **Scope is fixed at creation and cannot be changed.** Mint a new key instead.

### Why two keys

`remit-dryrun` (`mcp:read`) simulates. It is *structurally incapable* of broadcasting —
the server answers `403 insufficient_scope`. `remit-execute` (`mcp:read mcp:write`) is the
only credential in the system that can put a transaction on chain, and it is used on
exactly one code path, after threshold is met.

This is not decorative. KeeperHub issues `#1959` and `#1929`, both `accepted, confirmed`,
report that `simulate=true` is ignored on some execute routes and the transaction
broadcasts anyway. A read-scoped key turns that bug into a 403 instead of a live
transaction. Cite this in the README and the pitch — defending against a known open bug in
the platform you are integrating is a reliability argument the rubric explicitly asks for.

## Contract reads need `simulate: true`

`POST /api/execute/contract-call` requires `mcp:write` for any call without
`"simulate": true`, **even for a `view` function**. The scope gate keys off the simulate
flag rather than the function's mutability. So every read Remit makes — `getOwners`,
`getThreshold`, `nonce` — sends `simulate: true` even though nothing is being simulated.

This is not a style choice; without it the read path would have to hold the write key and
the two-key design would collapse. See `FINDINGS.md` §1 for the reproduction and the fix.

## Docs that are authoritative

- KeeperHub MCP tools — https://docs.keeperhub.com/ai-tools/mcp-server
- KeeperHub agentic wallet, x402/MPP — https://docs.keeperhub.com/ai-tools/agentic-wallet
- Safe Transaction Service — https://docs.safe.global/core-api/how-to-use-api-keys
