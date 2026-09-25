# Click script

The demo recording is website only: one browser, no terminal, no editor, no repo. Every click below
was made by hand against `https://manifest-mocha-six.vercel.app`. Nothing was staged, and the
recording is one take.

| # | On screen | Click |
|---|---|---|
| 1 | landing | scroll past the claim and the stats row |
| 2 | landing | **Open the desk** |
| 3 | overview | nothing: the page reads the mint and fills itself in |
| 4 | nav | **Assets** — the board of mints this desk can price |
| 5 | assets | sort by **fee**, to see the one in force against the one scheduled |
| 6 | nav | **Analyze mint** — paste a mint, read the account itself |
| 7 | analyze | scroll to the fee schedules: slot and epoch printed next to them |
| 8 | other tab | the pool this desk prices, open on the venue's own page |
| 9 | nav | **Settlement** — pick a size, read quote, withholding, landing |
| 10 | settlement | **Execute** — the wallet asks for one signature |
| 11 | nav | **Transactions** — paste a signature, watch the receipt rebuild |
| 12 | nav | **Proof** — run the declared cases |
| 13 | nav | **Overview** — the close |

Two things were cut from the recording rather than performed again:

- the wallet's risk gate on the swap, which is answered in
  `app/app/api/swap/route.ts` (no wrapping, bounded fee), and
- the explorer returning `Not Found`, because it was pointed at Mainnet Beta while the
  transaction is on devnet.

Both are described in `demo/NARRATION.md`.
