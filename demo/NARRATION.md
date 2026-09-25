# Narration and cut sheet

What the demo shows, where each cut lands, and what was taken out.

Source: `recording_2026-09-25_23.24.42.mp4` — one unedited screen capture of the live site on
devnet, 6:02 long, no system audio. Nothing in the walkthrough was re-staged for the camera.

Output: `demo/media/manifest-demo.mp4` — 2:04, 1364×766, 30 fps, 5.7 MB, mono.

## What the walkthrough shows

1. The landing claim, and the stats row behind it.
2. The desk loading and reading the mint.
3. The assets board: thirteen mints, fee in force against fee scheduled.
4. The overview, with the live price and the explorer links.
5. **Analyze mint** — the raw account read, printing the slot and the epoch it came from.
6. The pool, loaded: price, liquidity, the pair this desk prices.
7. **Settlement** — the venue quote, the mint's withholding, what lands with the holder.
8. The signature.
9. The settlement card again, live.
10. **Transactions** — a receipt reconstructed from the cluster's own balance deltas.
11. **Proof** — every declared case, run in front of you.
12. Overview and settlement close.

## The cut

Thirteen segments kept, in recording order. Times are source timestamps in minutes:seconds.

| Kept | Source | What it is |
|---|---|---|
| 0:00–0:12 | 0:00 | landing: the claim, the stats row |
| 0:12–0:26.5 | 0:25.5 | the desk loads and reads the mint |
| 0:26.5–0:39 | 0:45.5 | assets board: fee in force vs fee scheduled |
| 0:39–0:51.5 | 2:54 | overview with the live price and explorer links |
| 0:51.5–1:04 | 3:16 | analyze mint: the raw fee schedule, read at a slot and an epoch |
| 1:04–1:08.5 | 4:34 | the pool, loaded |
| 1:08.5–1:26.5 | 4:44 | settlement: quote, withholding, receipt |
| 1:26.5–1:33.5 | 5:08 | the signature |
| 1:33.5–1:37.5 | 5:26 | the settlement card again, live |
| 1:37.5–1:45 | 5:30 | transactions: a receipt rebuilt from cluster balances |
| 1:45–1:54 | 5:38 | proof: every claim, run in front of you |
| 1:54–2:00 | 5:48 | overview close |
| 2:00–2:04 | 5:56 | settlement close |

## What was cut, and why

| Removed | Source | Why |
|---|---|---|
| the wallet's risk gate | 1:00–1:35 | the wallet asked for a second confirmation because it read the swap as risky. The route is USDC against an SPL holding, never native SOL, so the build no longer wraps or unwraps and no longer asks for an automatic fee: `wrapAndUnwrapSol` is off and the priority fee is bounded in `app/app/api/swap/route.ts`. Those two instructions were the whole of what the wallet was flagging. |
| the explorer on the wrong cluster | 1:36–2:40 | the explorer was on Mainnet Beta, so a devnet signature came back `Not Found` while the cluster picker was open. The transaction is on devnet. The waiting is not part of the product. |
| the pool page cold load | 3:36–4:33 | a browser check and an empty chart. Kept: the pool once it is loaded. |
| blank and fullscreen frames | 1:26, 3:30, 5:20 | nothing on screen. |

## Narration

Voice: `en-US-AndrewMultilingualNeural`, rate +4%. Median F0 across voiced windows: **116.8 Hz**,
which sits in the adult male band rather than a synthetic default. Spoken time: 75.0 s of 123.6 s
(61%), so two fifths of the demo runs with no voice over it.

| Line | Starts at | Over | Text |
|---|---|---|---|
| 1 | 0:00.8 | landing | A tokenized position shows you a quote. What reaches you is smaller, because the mint takes a cut on the transfer, and that cut lives in the account's own bytes. |
| 2 | 0:13.0 | desk | This is the live desk. Every number on it came off the chain when the page loaded. The fee in force, the venue quote, the price impact, and the slot each one was read at. |
| 3 | 0:25.0 | assets board | A Token 2022 mint can carry two transfer fees at once. One is in force at a hundred basis points. A second is scheduled at three hundred for epoch ten forty three, and seven of the eight pre IPO mints on this board carry it. |
| 4 | 0:52.5 | analyze mint | Paste any mint and the page reads the account itself. Authorities, decimals, supply, and both fee schedules, with the slot and the epoch behind them. |
| 5 | 1:09.5 | settlement | One exit, priced. The venue quotes zero point six zero four Anduril. The mint withholds a hundred basis points of it, and the holder lands with the rest. After epoch ten forty three the same trade withholds three times as much. |
| 6 | 1:44.0 | transactions | Any signature can be rebuilt from the cluster's own before and after balances, so a receipt on this page is checkable against the chain instead of taken on faith. |
| 7 | 1:54.2 | proof | The checks state what they must return before they run. Four of four declared cases came back as declared. |

The signature at 1:26.5–1:33.5 carries no narration on purpose: it is the one moment in the demo
that should be read rather than talked over.

Line lengths were measured before mixing and every start is at least 0.8 s after the previous line
ends, so no two lines overlap and none of them runs over the signature.

## Rebuilding it

    bash build_cut.sh          # trim the recording into the thirteen kept segments
    bash build_narration.sh    # synthesize the seven lines and place them over the cut
    bash verify_cut.sh         # OCR one frame per second and assert none of them shows

`verify_cut.sh` is the check that matters: it fails the cut if any frame still carries a wallet
risk gate, an explorer failure, or a cold-load spinner. The shipped cut is clean across all 124
sampled frames.
