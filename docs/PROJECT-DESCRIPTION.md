# Manifest

## What it is

Manifest answers one question about a tokenized equity: what lands in the account when you leave, after the mint has taken its cut. The number a pool quotes is not the number that arrives, and it is always the larger one.

Almost everyone builds a way in. Tokens get listed, charts get built, dashboards get shipped. This is the other direction.

## The gap

A swap quote is the pool's arithmetic. It cannot see the mint's transfer-fee extension, which withholds a percentage of every transfer of a Token-2022 token. So a holder is shown a number larger than the one they receive, and the difference is not small.

Read live from a tokenized pre-IPO equity: 100 basis points in force since epoch 1039, with a second schedule of 300 bps already announced for epoch 1043. The extension's maximum fee is 18446744073709551615, so the ceiling is uncapped in practice. Seven of the eight mints on that shelf carry the same increase. None of it is hidden. It sits in the account bytes, public, and it is absent from every price a holder looks at.

## How a reading works

The desk reads the mint account and finds the transfer-fee extension where it sits in the TLV region, not at a fixed offset, because its position depends on what the issuer installed before it. It picks the schedule in force by comparing the current epoch with the epoch each schedule begins at. That step is the exercise: two schedules can sit on a mint at once, and the older one is wrong the moment the newer one starts. The same pass reads the authorities, the transfer hook, the pause flag, and whether the token is transferable. A quote mentions none of them, because it cannot see them.

## One read, four numbers

The desk reports what the pool quotes, what the fee withholds, what lands, and what a round trip costs. At slot 450440098: quote 164,794,340, withheld 1,647,943 at 100 bps, landed 163,146,397. In and out again costs 19,900,000, 199 bps of the notional, because the fee is charged on both legs. Stopping at the quote leaves the holder short by an amount they never see.

At size the desk refuses instead of guessing: a 1,000-token exit at 841 bps of impact against a 300 bps bound returns REFUSE, reason impact_over_bound.

## The desk

Pick a holding, set a size. The size runs from a fraction of a percent of the float up to the whole thing, and every read is priced at the size you asked for, never at a headline number. The four figures move as the size moves, so the cost of leaving is visible instead of implied. Any read can be linked to; the link re-runs the same request for whoever opens it.

## Three ways out

A pool is executable now. An issuer's redemption window is a promise made off chain, so it is named and never scored as achievable. A second issuer of the same company exists only when one is observed on chain. The desk prices each route, marks the best one at your size, and refuses by name when none works.

On a devnet replica two issuers of the same company each have a pool against wrapped SOL, and an exit across both settles in a single transaction: 100,000,000 of issuer B becomes 94,306,362 of issuer A. No second issuer of the same company trades on the live network yet, and the desk says so rather than quoting one.

## The shelf

Reading eight mints from one issuer in a single pass turns an anecdote into a pattern. Seven announce the same increase, and one prices 33% away from its issuer's mark.

## Evidence

A verifier program on chain records a reading and then refuses one that stops matching, returning ReadingScheduleChanged once the issuer moves the fee. 423 node tests cover the engine and the terms reader. An independent Python verifier walks the Token-2022 region itself, in a different language, and re-derives both schedules across 30 checks. 14 pool checks prove the pool layout byte by byte. 12 live comparison checks price two issuers against each other. 13 checks run against a local validator cloning real devnet accounts, with a mutated control that must fail. An ablation shows what ignoring the epoch costs: the shortcut overstates the exit by 40,000,000,000 micro-units, and the gate reports it.

## What it refuses to claim

The second issuer is devnet only and is labelled that way everywhere it appears. The fee schedule is public, and the project surfaces what already exists rather than implying wrongdoing by anyone. Where a number cannot be read the answer is a named reason; a zero would be a different claim.

## Surfaces

The landing page explains the idea; the desk prices a single exit. The issuers board reads every mint in the registry and shows what leaving each one costs. The tape is an append-only log, and each read at the desk adds a line to it. The checks page runs the whole matrix on the click and reports which cases returned what they declare. Any signature can be rebuilt from the cluster's own balances. Every mint has a page with its terms, its authorities and its schedules.
