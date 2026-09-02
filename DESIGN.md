# Design

Remit is not a wallet and not a dashboard. It is a **record** — of authority granted, and
authority exercised. Everything below follows from that.

Tokens live in `app/globals.css` and that file is authoritative. This document covers
screens, states and the reasoning; it does not restate colour values.

## Direction

**Instrument.** A document you sign, not a dashboard you watch. Warm paper, hairline rules,
near-square corners, no shadows, no gradients, no charts. Most of the data is hashes,
addresses and calldata, so monospace carries the weight and prose is reserved for the few
places a human wrote something.

The single accent (`--seal`) appears on the identity verdict and nowhere else. If it shows
up on a button, that is a bug.

## Surface area

Two routes and one input. Three things that work beat a suite that does not.

| Route | Is |
|---|---|
| `/` | **The register.** Safe header — owners, threshold, nonce, balance — then one row per remit. |
| `/r/[id]` | **The remit.** The signature component, full page. This is the product. |

Composition is not a page. It is an input at the top of the register where you state intent
in plain language; the agent composes and you land on the remit.

No sidebar. Two routes do not need navigation. No theme toggle — the system decides.

## The Remit

One object, read top to bottom as a chain of custody. Each band is a link; the last band is
the verdict.

```
INTENT     "pay the contractor 12.50 USDC"
           composed by claude-opus-5 · 14:02:11

CALL       transfer(address,uint256)
           to     0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238   USDC · Sepolia
           data   0xa9059cbb000000000000000000000000ed5544b3d208094d20bc19468b3a26c0f53e35250000000000000000000000000000000000000000000000000000000000bebc20
                  ← 68 bytes, shown in full. never truncated.
           value  0
           op     CALL

DRY RUN    simulated through KeeperHub · chain untouched
           result success · 47,210 gas
           key    remit-dryrun (mcp:read) — cannot broadcast

SIGNED     safeTxHash  0x7f2c…
           2 of 2 confirmations · Safe Transaction Service
           0xeDBb…  14:04:02
           0xED55…  14:04:09

EXECUTED   0x9a1f…  on Sepolia
           relayer 0xC5A9… — not an owner of this Safe
           gas 51,004 · 1 attempt

IDENTITY   signed bytes  ≡  executed bytes           ✓
```

### Two decisions that carry the identity

**The calldata is never truncated.** Every other crypto interface shortens hex to
`0xa905…4c4b40`. Remit shows all 68 bytes, because the claim is *about* the bytes.
Truncating would quietly undercut the product. It gets its own `overflow-x` container so
the page never scrolls sideways.

**The identity band is a stamp, not a toast.** It is the only seal-coloured element in the
product, and it reads as something applied to a finished document. On failure it is the
same stamp in `--alarm` reading `MISMATCH`. This is the element a judge remembers when they
cannot remember the project name, and it is what the demo zooms to at second 40 — which
only lands if everything above it stays quiet.

## States

Eight, all reachable, all designed. Most entries build one.

| State | Reads as |
|---|---|
| `composed` | agent produced it; not yet proposed. Identity band absent, not empty. |
| `proposed` | in the Safe queue. Signature count live, links out to Safe{Wallet}. |
| `refused` | policy declined. Greyed and inert with the reason stated. Not an error — a correct outcome. |
| `expired` | the Safe nonce moved past it. Explained, not just dimmed. |
| `executing` | submitted. Attempt count and gas escalation visible while it waits. |
| `executed` | verdict ✓. |
| `failed` | reverted. Shows the revert reason. Honest, not hidden. |
| `mismatch` | the alarm. Signed and executed bytes shown side by side with the differing region marked. |

`refused` and `mismatch` are the two that matter most and the two nobody else will build.
Rubric line 3 asks whether the build survives conditions that are not the happy path, and
these are that question answered on screen.

## Responsive

Decided, not shrunk. The remit is a single column of bands at every width — it already
reads as a document, so nothing needs to reflow. What changes:

- calldata keeps its own horizontal scroll rather than wrapping into mush
- the register goes from table rows to stacked records below `640px`
- the Safe header drops the nonce and keeps owners, threshold and balance

## Rules of construction

- No component library. Radix only if a genuine dialog appears — currently none does.
- Hand-build the ten or so elements that carry identity: the band, the stamp, the hex block,
  the signature progress, the state chip. That is the whole primitive layer.
- Every element the film points at carries `data-shot`. The pipeline targets that attribute,
  never a Tailwind class, so restyling cannot silently break the video.
- Every state renders from real data or renders its empty state. Nothing is invented.
