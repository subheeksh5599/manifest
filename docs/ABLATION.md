# Ablation

Remove the epoch read and price the same exit again. If the number does not
move, the read was decoration.

The read in question is which of the mint's two fee schedules is in force. Every
quote that ignores the transfer-fee extension behaves as though the schedule
never changes. Guarding the read off is exactly that: always take the older
schedule, whatever the epoch.

## Paired run, same exit, same size

Evaluated at epoch **1044**, one past the epoch the announced schedule takes
effect, against a real mint whose schedules are 100 bps at epoch 1039 and 300 bps
at epoch 1043. Size 1,000,000,000, quoted at 163,853,738.

With the epoch read:

    300 bps   withheld 4,915,612   lands 158,938,126

With the epoch read removed:

    100 bps   withheld 1,638,537   lands 162,215,201

The read is worth **3,277,075 micro-units** on this exit. A holder relying on the
second number is short by three of them.

Reproduce it with the verification route, which computes both figures in the same
response:

```bash
curl -s localhost:3000/api/verify | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["ablation"], indent=2))'
```

## Why the two numbers agree today

They do not differ at epoch 1042, and the page says so rather than implying they
always differ. While the older schedule is the one in force, ignoring the epoch
read produces the correct answer by accident. The read only earns its place from
the moment the announced schedule takes effect, which is why the ablation is
evaluated at 1044 rather than at the current epoch.

An ablation run at the current epoch would show a zero difference and prove
nothing. That distinction is the whole point of running it at a named epoch.

## The same ablation, independently

`scripts/adversarial_gate.py` carries this as its fourth hostile check,
`ablation_understates_the_exit`. It evaluates the pair at the sizes its own
fixture uses and asserts the gap in the direction the product claims, so the two
implementations have to agree:

```bash
python3 scripts/adversarial_gate.py
```

Exit zero means every hostile check passed. Exit non-zero means the load-bearing
property is broken and the refusal system should not be trusted — treat it as a
real bug, not as a failing test to be adjusted.
