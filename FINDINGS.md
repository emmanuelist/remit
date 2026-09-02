# Findings

Platform issues found while building Remit against KeeperHub, with reproductions.
Kept in the open because naming what broke is more useful than implying nothing did.

---

## 1. A read-only contract call requires `mcp:write`

**Status:** not reported upstream as of 2026-09-02. Verified against production.

`POST /api/execute/contract-call` decides the scope it requires from the `simulate`
flag, not from the function's mutability:

```ts
// app/api/execute/contract-call/route.ts
const scopeError = requireScope(
  apiKeyCtx.scope,
  simulateFlag.simulate ? SCOPE_MCP_READ : SCOPE_MCP_WRITE,
);
```

The view/pure detection exists, but roughly 65 lines further down:

```ts
fnResult.entry.stateMutability === "view" ||
fnResult.entry.stateMutability === "pure";
```

So the gate runs before anything knows the call cannot write.

### Reproduction

Calling `getOwners()` — `stateMutability: "view"` — on a Safe with an `mcp:read` key:

```
POST /api/execute/contract-call        → 403
{
  "error": "insufficient_scope",
  "required_scope": "mcp:write",
  "granted_scope": "mcp:read"
}
```

The identical body with `"simulate": true` succeeds and returns the value.

### Why it matters

`docs/api/direct-execution.md` says this route "automatically detects read vs write
operations", and `docs/api/api-keys.md` says a key scoped `mcp:read` "can read and simulate
but cannot broadcast". For a view function, both readings imply a read-scoped key is
enough. It is not.

The practical consequence is the wrong one for a permissions model: an agent that only ever
reads contract state must either hold `mcp:write` — the scope that can move money — or pass
`simulate: true` on calls where nothing is being simulated. The first defeats least
privilege; the second is a lie in the request body.

### Suggested fix

Resolve the ABI entry before the scope gate and require `SCOPE_MCP_READ` when
`stateMutability` is `view` or `pure`, regardless of the `simulate` flag. The detection
already exists and only needs to move ahead of the gate.

### Workaround in use

Remit passes `simulate: true` on all contract reads. Recorded in `AGENTS.md` so the reason
is visible at the call site rather than looking like a mistake.


---

## 2. KeeperHub broadcasts through a relayer, so the executed calldata is not `execTransaction`

**Status:** behaviour, not a bug. Recorded because it invalidates the obvious design.

A remit executed through `POST /api/execute/contract-call` does not arrive at the Safe as a
direct call. The transaction that lands is:

```
EOA 0x809d…0444  →  relayer 0x5af5…f07d  (selector 0x9aefaff8, 900 bytes)
                 →  Safe 0xA4A1…AD11     execTransaction
                 →  USDC 0x1c7D…7238     transfer
```

The KeeperHub wallet the dry run reports as `from` (`0xc5a9…6c91`) appears as an *argument*
to the relayer, not as the transaction sender.

### Why it matters

The obvious way to prove a signed call is the executed call is to decode the executed
transaction's input and compare it field by field. That returns `UNDECODABLE` here: the
top-level input is the relayer's calldata and `execTransaction` is nowhere near the top.
Any integration that verifies by decoding top-level calldata will silently fail against
KeeperHub, and a naive implementation might report a mismatch that does not exist.

### What Remit does instead

Reads the Safe's own attestation. On success the Safe emits

```
ExecutionSuccess(bytes32 indexed txHash, uint256 payment)
```

where `txHash` is the EIP-712 `safeTxHash` — a commitment to `to`, `value`, `data`,
`operation`, the gas fields and the nonce. If the Safe emits that event for the hash the
owners signed, the executed call was byte-identical to the approved one by construction.

This is the better proof anyway. It does not depend on Remit decoding anything correctly,
and it holds however many relayers sit in front. Only logs emitted by the Safe itself are
considered — any contract can emit an event with the same signature, and `tests/identity.test.ts`
covers exactly that impersonation case.

Verified on `0x14db36c9…7f49d`: relayer entrypoint, `ExecutionSuccess` for
`0x4d324cd7…1ccb`, verdict `IDENTICAL`.
