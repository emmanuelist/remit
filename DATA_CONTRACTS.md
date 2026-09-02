# Data contracts

Every value crossing a seam. Written before the routes, so the UI is never designed against
imagined data. Field-level source of truth is listed in `CLAUDE.md` rule 1.

## Where the intent lives

Remit does **not** keep its own copy of the intent. It is written into the Safe Transaction
Service's `origin` field on the proposal itself, so it sits in the record the owners are
signing, travels to Safe{Wallet}, and survives Remit being down. A separate store would let
our copy drift from the proposal it describes.

The envelope is minimal for one reason: `origin` is capped at **200 characters**. That is
measured, not read — a 212-character envelope is rejected with `422 Unprocessable Content`,
a 188-character one is accepted, and the api-kit types say only `origin?: string`.

```json
{"name":"Remit","intent":"pay the contractor 12.50 USDC","composer":"deterministic/erc20-transfer@1"}
```

An intent that does not fit is **refused, not trimmed** (`IntentTooLong`). A product whose
claim is fidelity does not quietly shorten what a person said. `intentBudget()` reports how
many characters remain for a given composer name.

The ceiling is the reason a store of our own comes back later: dry-run results and longer
intents do not fit in 200 characters. Until they are needed, an external database earns
nothing.

## Remit — our record, Postgres [deferred]

Written before the proposal is sent. Never reconstructed after the fact.

| field | type | source |
|---|---|---|
| `id` | uuid | us |
| `safeAddress` | `0x${string}` | us, at creation |
| `chainId` | number | us |
| `intent` | text | the agent's stated purpose, in its own words |
| `to` | `0x${string}` | agent-composed |
| `value` | string, wei | agent-composed. String. Never a number. |
| `data` | `0x${string}` | agent-composed calldata — **the thing being claimed about** |
| `operation` | 0 \| 1 | CALL or DELEGATECALL |
| `safeNonce` | string | read from chain at compose time |
| `safeTxHash` | `0x${string}` | derived, then confirmed against the Transaction Service |
| `dryRun` | json \| null | KeeperHub simulation result, chain untouched |
| `proposedAt` | timestamptz | |
| `executedTxHash` | `0x${string}` \| null | filled by phase 4 |
| `status` | enum | `composed` `proposed` `refused` `expired` `executing` `executed` `failed` `mismatch` |

`mismatch` is a real, reachable state. It is not decoration.

## Safe Transaction Service — read

Via KeeperHub's `get-pending-transactions` action, which returns per transaction:
`safeTxHash`, `to`, `value`, `data`, `operation`, `nonce`, `confirmations`,
`confirmationsRequired`, `dataDecoded`, `submissionDate`.

Requires a Safe API key as `Authorization: Bearer`. Free tier without a key is 2 RPS and
5,000 requests/month; KeeperHub's plugin requires the key regardless.

## Chain — read, through KeeperHub

`getOwners() → address[]`, `getThreshold() → uint256`, `isOwner(address) → bool`,
`nonce() → uint256`, `isModuleEnabled(address) → bool`,
`getModulesPaginated(address,uint256) → (address[], address)`.

## Execution — through KeeperHub

`execute_contract_call` against the Safe's `execTransaction`. Returns an execution id;
status and gas come from `get_execution` / `get_direct_execution_status`.
Direct execution tools carry a 55-second fetch timeout; cold starts should be retried with
the **same** `idempotency_key`.

Note issue `#1840`: a reused idempotency key replays a cached *failure*, so a retry after a
genuine failure can never succeed. Do not paper over this — surface it, and cite it.

## The identity proof — `lib/identity.ts`

```
signed   = the (to, value, data, operation, nonce) preimage of safeTxHash
executed = the same fields decoded from the executed transaction, read from the chain
verdict  = signed ≡ executed
```

The executed side is read from the chain, never from our own row. A verifier that trusts
our database proves nothing.
