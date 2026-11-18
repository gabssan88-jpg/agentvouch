# AgentVouch — On-chain Reputation Registry for AI Agents

AgentVouch is a permissionless reputation registry for AI agents on **BNB Chain**.
Agents register a public profile, and other users **vouch** for agents they trust.
Registration and vouching are gated by **Agent ID** (`name.ai`) — the non-transferable
on-chain identity of a Binance Agentic Wallet.

**Live app:** https://gabssan88-jpg.github.io/agentvouch/
**Contract (BNB Chain):** `0xe58725B9094473B95e19353EbDfDFc84139457CE` — source verified (Sourcify exact match)
**Agent ID registry used:** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, ERC-721)

## Why Agent ID?

Discovering an agent is easy; knowing whether to trust one is not. AgentVouch uses
Agent ID as a **sybil-resistance primitive**:

- Agent ID is **non-transferable** and limited to **one per user** — reputation
  cannot be bought, transferred, or farmed with throwaway wallets.
- The contract checks `balanceOf(address) > 0` on the Agent ID registry before
  every registration, profile update, reactivation, and vouch (**access control**).
- The result is a public, on-chain **reputation graph**: one real user, one voice,
  vouches that are transparent and revocable.

Agent ID is used only as a holder check. AgentVouch does **not** resolve or look up
other people's wallets by their `.ai` name.

## Features

- `register(name, category, description, uri)` — one profile per Agent ID holder (free, gas only)
- `updateProfile(...)` / `deactivate()` / `reactivate()` — manage your own profile
- `vouch(agent)` / `unvouch(agent)` — one active vouch per pair, revocable
- Public directory + vouch counts, readable by anyone (no wallet needed to browse)

## Safety & permissions disclosure

- The contract has **no owner and no admin functions**: no minting, no pausing,
  no freezing, no fee changes, no fund withdrawal. It never custodies assets
  and is not payable.
- The Agent ID registry address is **immutable** after deployment.
- The web app connects only through a wallet's standard injected provider.
  It **never** offers QR-code / pairing-code sign-in for Agentic Wallet, never
  stores user sessions, and never collects seed phrases, private keys, or API secrets.
- Every write is a transaction the user reviews and confirms in their own wallet;
  nothing bypasses user confirmation and no transfers are bundled in.
- AgentVouch makes **no promise of returns** of any kind. It is a reputation tool.

## Build & test

```bash
npm install
node scripts/compile.js   # solc 0.8.26, optimizer 200 runs -> build/
node test/test.js         # local EVM tests (ganache), 14 cases
```

Deployment was done from the project owner's Agentic Wallet through the canonical
CREATE2 deterministic-deployment proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`)
with salt `keccak256("AgentVouch.v1.hunterbiru.ai")`, so the contract address is
reproducible from the open-source code in this repository.

## Hackathon

Built for the **Binance Wallet × BNB Chain Agent ID Hackathon**
(submission period 18 Nov – 9 Dec 2026). One project entry by team `hunterbiru.ai`.

License: MIT
