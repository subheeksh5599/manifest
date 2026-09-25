# Manifest

## What it is

Manifest answers one question about a tokenized equity: what lands in the account
when you leave, after the mint has taken its cut. The figure a pool quotes is a different number from the one
that arrives, and usually a larger one.

Everyone here built a way in. Tokens get issued and listed, charts get built,
dashboards get shipped. Almost nobody builds the other direction. That is the
project.

## The gap

A swap quote is the pool's arithmetic. It knows nothing about the mint's
transfer-fee extension, which withholds a percentage of every transfer of a
Token-2022 token. So the number a holder is shown is bigger than the number a
holder receives, and the difference is not small.

Read live from a tokenized pre-IPO equity: 100 basis points in force now, with a
second schedule of 300 bps already announced for the next epoch. The maximum fee
on that extension is uncapped in practice. Seven of the eight mints on that shelf
carry the same increase. None of this is hidden. It sits in the account bytes,
public, and it is absent from every price a holder looks at.

## How a reading works

The desk reads the mint account and finds the transfer-fee extension where it
sits in the TLV region not at a fixed offset, because the extension's
position depends on what the issuer installed before it. It then picks the
schedule in force by comparing the current epoch against the epoch each schedule
begins at. That step is the point of the exercise: two schedules can sit on
a mint at once, and the older one is wrong the moment the newer one starts. The
same pass reads the mint's authorities, whether a transfer hook is installed,
whether the mint is paused, and whether the token is transferable. A quote will never
mention any of those, because it cannot see them.

## One read, four numbers

The desk reports what the pool quotes, what the fee withholds, what lands, and
what a round trip costs. Live, at a size: the pool quotes 162,907,033, the mint
withholds 1,629,070 at 100 bps, and 161,277,963 lands. Going in and out again
costs 19,900,000, because the fee is charged on both legs. Checking the quote and stopping there
leaves the holder short by an amount they never see.

## The desk

Pick a holding, set a size. The size runs from a fraction of a percent of the
float up to the whole thing, and every read is priced at the size you asked for
not at a headline number. The four figures move as the size moves, so the
cost of leaving is visible instead of implied. Any read can be linked to, and the
link re-runs the same request for whoever opens it.

## Three ways out

A pool is executable now. An issuer's redemption window is a promise made off
chain, so it is named and never scored as achievable. A second issuer of the same
company only exists when one is observed on chain. The desk prices each route,
marks the best one at your size, and refuses by name when none works.

On a devnet replica, two issuers of the same company each have their own pool
against wrapped SOL. An exit across both settles in a single transaction:
100,000,000 of issuer B becomes 94,306,362 of issuer A. On the live network no
second issuer of the same company trades yet, and the desk says so rather than
quoting one.

## The shelf

Reading eight mints from one issuer in a single pass turns an anecdote into a
pattern. Seven of them announce the same increase. Mark price against token price
diverges by as much as 33% on one of them. A holder comparing the two is looking
at a gap nobody is obliged to reconcile, so it stays where it is.

## Evidence

A verifier program on chain records a reading, then refuses one that stops
matching, returning ReadingScheduleChanged once the issuer moves the fee. 423
node tests cover the engine and the terms reader. An independent Python verifier
walks the Token-2022 region itself, in a different language, and re-derives both
schedules across 31 checks. 14 pool checks prove the pool layout byte by byte. 12
live comparison checks price two issuers against each other. 13 checks run against
a local validator cloning real devnet accounts, with a mutated control that must
fail. An ablation shows what ignoring the epoch costs: 19,900,000 reported where
the truth is 59,100,000.

## What it refuses to claim

The second issuer is devnet only, and it is labelled that way everywhere it
appears. The fee schedule is public, and the project surfaces what already exists
rather than implying wrongdoing by anyone. Where a number cannot be read, the
answer is a named reason. A zero would be a different claim.

## Surfaces

The landing page explains the idea. The desk prices a single exit. The issuers
board reads every mint in the registry and shows what leaving each one costs. The
tape is an append only log, and each read at the desk adds a line to it. The
checks page runs the whole matrix on the click and shows which cases returned what
they declare. Every mint has a page with its terms, its authorities, and its
schedules.
