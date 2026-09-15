# Submission text

Three messages, no AI-slop voice, no em dashes.

## Message 1: what it does

Scheduled tokenized-stock buys on Solana that either fill at a verified price or publicly refuse. Every refusal is a receipt you can verify by re-reading the chain. The invariant is one line: no unit of equity moves unless the trade is provably safe at that instant, against live Token-2022 extension state on mainnet.

## Message 2: what a judge can click

Open the live app, pick a mint from the registry, press evaluate. The verdict card shows the live on-chain multiplier that decided it, at a named slot. Change the plan's snapshot to a stale value, evaluate again, watch it refuse with `multiplier_freshness`. All four refusals plus one accept are reproducible with the scripts in the repo, no wallet, no funds, no API key.

## Message 3: what is deliberately not built

No public mainnet fill. The zero-cost edition moves the proof off "we broadcast a transaction" and onto "the guard's inputs and verdicts are read from live mainnet, and refusals are permanent because they are never broadcast." The switch to a broadcast path is one deployed program id plus a funded key, and the evaluator code is the same. Credit, lending, yield, and cross-chain are out of scope on purpose: one wedge, executed end to end.
