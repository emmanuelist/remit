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
