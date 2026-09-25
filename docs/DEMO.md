# Demo

Recorded on the live site, no terminal, no GitHub. Clicks and narration only.
Every label below is a real control and every number was read from the live build.

Total 1:50. The first 35 seconds are the whole argument; everything after that is
a judge convincing themselves.

---

## 0:00 — Landing

**Do:** open https://manifest-mocha-six.vercel.app and stop.

**Say:** "Every product in this field shows you what a venue quotes for a
tokenized stock. None of them show what the token withholds before the money
lands. This is the exit side."

---

## 0:15 — The three numbers

**Do:** click **Exit Desk** in the left nav. Press the **ANDURIL** chip.

**Do:** press **Read the exit**.

**Say:** "Anduril, one share, a billion base units. Three numbers, in order."

**Do:** let the desk settle, then point at the three tiles in turn.

**Say:** "Quoted by the pool, 163,863,331. Withheld by the mint, 1,638,633 — a
percent. Lands with the holder, 162,224,698. That middle number is the one no
quote anywhere shows you, and it exists it because the mint carries a
transfer-fee extension that charges on the way out."

**Say:** "The slot is on screen. Every number here came off the account bytes at
that slot, not from a database."

---

## 0:45 — The schedule nobody displays

**Do:** scroll to the card headed **Schedule not yet in force**.

**Say:** "This is the part I actually built this for. The mint carries a second
transfer-fee schedule, 300 basis points, that takes effect at epoch 1043. The
chain is at 1042. Both numbers are public. The issuer signed it. Nothing displays
it."

**Say:** "The same exit then withholds 4,915,899 instead of 1,638,633. Same
holding, same pool, same everything. Three times the cut, from a change that has
already been made."

**Do:** scroll to **Transfer-fee schedules on the mint**.

**Say:** "Both schedules, read from the account bytes. One in force, one not."

---

## 1:10 — What can and cannot be done today

**Do:** scroll to **Exit routes**.

**Say:** "Three ways out, each priced. The pool lands 162,224,698 at 20 basis
points of impact. A second issuer is not achievable, and it says why:
no second issuer observed. The issuer's own redemption is not achievable either,
and it says that too: off-chain, not executable from here."

**Say:** "I would rather show you two exits that do not exist than invent them.
A refusal that names its reason is worth more than a number with no provenance."

---

## 1:25 — Watch the checks run

**Do:** click **Verification** in the left nav. Press **Run again**.

**Say:** "This page has no precomputed rows. Everything below it is evaluated by
the request that button just made, and the timestamp is on screen so you can tell
it is not a screenshot."

**Do:** let it finish, then point at the matrix.

**Say:** "Four configurations against live state, four refusals, four different
reasons. A classic mint, where this extension cannot exist at all. A size a
hundred times the depth, refused at 9,990 basis points against a 300 bound. The
same holding under a stricter bound, refused at 99 against 50. And a mint nobody
has pooled, which refuses because no route exists to it."

**Say:** "Each one prints the value it saw. Then the ablation underneath: the same
exit priced with the epoch read and with it removed. The read is worth three
million micro-units on that exit, so it is doing work rather than sitting there."

---

## 1:50 — Close

**Say:** "One percent off a billion units today, three percent off it tomorrow,
and the two numbers that say so are in the mint's own account bytes. That is the
way out."

---

## What not to say

- Do not claim a swap was executed. A pool executes swaps; this is the layer that
  tells you what will land first. The README's honesty table says this in the same
  words.
- Do not claim mainnet execution. The program and the two-issuer replica run on
  devnet, and the reads come from mainnet.
- Do not say "insurance" or "guaranteed". Nothing here pays out.

## If something moves before recording

The epoch is a live read. If epoch 1043 has arrived by the time you record, the
300 basis points are in force and the card reads differently: the exit withholds
4,915,899 with nothing announced. In that case open the **Tape** page instead and
narrate the reading that shows both values, then say the schedule landed. Do not
record a number the screen does not show.
