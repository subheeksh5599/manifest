# Submission text

Three messages, no AI-slop voice, no em dashes.

## Message 1: what it does

Exit terms for tokenized equities on Solana, read from the mint itself. Every
surface in this field shows what a venue quotes; none of them show what the
mint withholds before the money lands. Manifest reports three numbers in order,
quoted, withheld, lands, and refuses with a named reason when no exit is
achievable at your size today. The invariant is one line: no holding is reported
as worth X unless X is achievable at the exit, at size, today.

The part that matters most is a schedule the issuer has already signed but not
yet charged. A mint can be trading at 100 basis points on the way out while
carrying a 300 basis point schedule set to take effect at a named epoch. Both
values are public, both sit in the account bytes, and almost nothing displays
either.

## Message 2: what a judge can click

Open `/verify` and press the button. Four configurations are evaluated against
real chain state by the request that page makes, each refused with its own named
reason and the live value that tripped it, with an acceptance case beside them:
four refusals, four distinct reasons, nothing precomputed. The same response
runs the ablation, pricing one exit with the epoch read and with it removed, so
the difference the read makes is visible rather than asserted.

Then `/exit` for the three numbers on a holding of your choosing, `/issuers` for
two issuers of the same asset class read live and compared, and `/tape` for the
readings with the slot each was taken at. No wallet, no funds, no API key.

## Message 3: what is deliberately not built

No mainnet transaction. The work runs against live mainnet reads plus a devnet
replica: two issuers created as real Token-2022 mints with real transfer-fee
extensions, one at zero and one at a hundred with three hundred announced, and a
real transfer in which the fee is measured rather than computed. The devnet
program records a reading and refuses one that stops reproducing.

Executing the swap itself is not claimed anywhere. A pool does that, and this is
the layer that tells you what will land before you ask one to. The issuer's own
redemption window is off chain and is reported as unreachable rather than priced
at a guess, and insurance, underwriting and payout are out of scope on purpose.
One wedge, executed end to end.
