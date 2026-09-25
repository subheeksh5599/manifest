# Refusals

Four refusals and one acceptance, all evaluated against real chain state,
keyless. A refusal is a different statement from a zero, and it carries a name.

The whole matrix runs on one request. Nothing is precomputed:

```bash
curl -s localhost:3000/api/verify | python3 -m json.tool
```

Or press the button on `/verify`, which makes the same request.

## The matrix

| case | what it is | verdict | reason | the value it saw |
|---|---|---|---|---|
| `classic_mint` | a mint the fee extension cannot exist on | REFUSE | `mint_not_token_2022` | `is_token_2022` is false |
| `over_bound` | the same exit at a hundred times the depth | REFUSE | `impact_over_bound` | 9990 bps against a 300 bound |
| `bound_is_the_holders` | the same holding under a stricter bound | REFUSE | `fee_consumes_position` | 99 bps against a 50 bound |
| `devnet_replica` | the replica issuer, read on devnet | REFUSE | `no_exit_route` | no route returned for it |
| `acceptance` | a real holding, at a real size | ROUTE | — | quoted 163853738, lands 162215201 |

Four refusals, four distinct reasons. Every row prints the live value that
decided it, because a refusal that does not say what it saw is an anecdote
rather than a check.

## Why the bound case is in the matrix

`bound_is_the_holders` and `acceptance` are the same mint at the same size. The
only difference is the bound: a thousand basis points of total cost, then fifty.
At a thousand the exit routes; at fifty it refuses at ninety nine.

That is deliberate. A bound is not a property of the chain, it is what the
holder is willing to pay, so the same exit is acceptable to one holder and a
refusal to another. Showing both is the honest way to say the engine is not
deciding on the holder's behalf.

## The two refusals that need a mint which exhibits them

| check | reason | why it is absent from the live matrix |
|---|---|---|
| `mint_not_paused` | `mint_paused` | No paused issuer mint has been observed in the registry. |
| `no_transfer_hook_program` | `transfer_hook_installed` | No registry mint has a hook program installed. |

Both are covered by unit tests against real account bytes rather than omitted,
so the path is exercised even though the live case is absent. When a mint in
that state is observed it belongs in the table above, and the table should say
so rather than stay quiet about what it cannot reach.

## The refusal that happens on chain

Beside the engine's refusals, the devnet program refuses one of its own.
`verify_reading` recomputes a recorded reading from the mint and returns
`ReadingScheduleChanged`, error 6003, when the issuer has moved the fee since
the record was written.

That refusal is witnessed with a signature in the README and reproducible with
`scripts/prove_onchain.mjs`. A number that stops being true should not keep
being served because nobody re-read the chain.
