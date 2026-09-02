# Remit

**An agent gets exactly the authority its owners signed — byte for byte.**

Remit is the proposal layer between an AI agent and a Safe multisig treasury. The agent
composes a treasury action; the owners review and sign it in Safe{Wallet}; KeeperHub
executes the exact approved calldata. The agent never holds a key.

**Live:** https://remit-pied.vercel.app
**Safe:** [`0xA4A12cCA345853A041C423fcA45Eb991B0FbAD11`](https://sepolia.etherscan.io/address/0xA4A12cCA345853A041C423fcA45Eb991B0FbAD11) · Sepolia · 2-of-3 · Safe v1.4.1
**Known issues found in the platform:** [FINDINGS.md](FINDINGS.md)

Built for the [KeeperHub — The Agent Economy Hackathon](https://dorahacks.io/hackathon/agent-economy/detail).

---

**Status: phase 0 — rig.** Scaffold, pinned toolchain and design tokens. The deployed page
holds no credentials yet, so every source reads "not set" — that is the honest empty state,
not a broken build. The build phase opens Sep 6.

This README becomes the verification surface at phase 7: live link, demo video, the
transaction executed through KeeperHub, and an honest account of what does not work.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Gates that must be green before any phase closes:

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

## Reading it

| | |
|---|---|
| `CLAUDE.md` | build rules and pinned versions |
| `AGENTS.md` | what is not the stack you remember, and the verified KeeperHub surfaces |
| `AGENT_PROGRESS.md` | phases, and where we are |
| `DATA_CONTRACTS.md` | every value crossing a seam, written before the routes |
