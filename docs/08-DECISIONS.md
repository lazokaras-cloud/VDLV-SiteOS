# Decisions and why

Things already settled, with the reasoning. If you want to change one, argue with
the reason rather than reopening the choice, and record the outcome here.

---

### D-01 — The rules engine is pure and dependency-free

Not date-fns, not lodash, no I/O, no ambient clock.

**Why.** It has to run in a Server Component, in the browser for optimistic UI,
in a sync worker, and eventually inside a React Native app on a handset with no
signal. Anything it depends on has to run in all four. It also has to be
exhaustively testable, and a function that reads the clock cannot be.

**Cost.** Roughly thirty lines of date arithmetic written by hand. Cheap.

---

### D-02 — A language model never produces a number

**Why.** A hallucinated working-day count is not a bad answer, it is a lost
claim. The whole product proposition is that the contract is in the software and
can be trusted. One wrong date destroys that permanently, and nobody would report
it as a bug because it looks like an answer.

**Consequence.** Voice input is speech to fields, read back, confirmed, and only
then computed from. The model handles language, the engine handles consequence.

---

### D-03 — Money is integer cents

**Why.** `186400 × 1.1` is `205040.00000000003` in floating point. There is a
test for exactly this in the fixtures. Rounding must be a decision made in one
place, not an accident distributed across the codebase.

---

### D-04 — Working days and calendar days are distinct types

**Why.** The domain mixes them freely and the mistakes are invisible. The
defects liability period is 90 **calendar** days; the final account window is 60
or 90 **working** days. Same shape, different meaning, silent when wrong.

---

### D-05 — Contract edition is a per-project property, not a setting

**Why.** Several editions run across one contractor at once, because each job
runs on the edition it was signed under and a building contract lasts years. It
is also a lookup off the project type, not a choice: type gives edition, payment
days and guarantee percentage together.

**Consequence.** There is no company default and no user is ever asked which
applies. The edition is set once at award and immutable after.

---

### D-06 — The baseline is immutable

**Why.** Stated by the contractor as "the contract is the baseline of
everything". A budget that moves with the job cannot tell you the job is losing
money.

**Consequence.** No update path in the model or the database. Re-baselining is an
explicit, recorded, exceptional act with a reason attached.

---

### D-07 — Binary status, never a percentage

**Why.** The contractor's own process gives every one of the 48 control points
exactly three fields: owner, target date, and complete or not. There is no "in
progress". That is what makes a completion figure trustworthy and a progress bar
honest, and it is what makes the number safe to show a director.

---

### D-08 — Preliminaries are classified time, value or fixed

**Why.** It is the mechanism behind every extension of time claim: time-related
lines keep running whether or not anyone is building. Held as one lump sum, which
is how most contractors hold it, the claim cannot be built at all.

**Consequence.** The classification is a required field, not an optional
analysis.

---

### D-09 — Integrate with the estimating and accounting packages, never replace them

**Why.** Both are mature, entrenched, and have twenty years of head start. The
gap is between them, not inside either. Attempting to replace one is how this
project dies.

**Consequence.** Read-only imports in version one. No writing back.

---

### D-10 — Two applications, one engine

**Why.** The site app is a one-handed conversation in the rain; the console is a
dense drill-down on a desk. They share domain and rules, not layouts. Forcing
them into one responsive application would produce something that is bad at both.

---

### D-11 — Offline first, not offline tolerant

**Why.** A lift shaft, a basement, a plot outside Bronkhorstspruit. An app that
is usable 80% of the time on a contractual deadline is worth close to nothing,
because the 20% is not random: it is exactly where the work is.

---

### D-12 — Afrikaans in site register, not textbook

**Why.** A system that forces a foreman to work in his second language is a
system he works around. Technical nouns stay English because that is what is
actually said out loud on a Gauteng site: notice, claim, contra, markup, VO, PA.
Translating those makes it read as a government form.

---

### D-13 — Yellow fills, a darker amber carries text

**Why.** The client's brand yellow is `#ffcb05`, which is about 1.9:1 against
white and unreadable as text. One accent token doing both jobs looks right in
dark mode and is quietly illegible in light. Already hit once.

---

### D-14 — The knowledge folder exists, and the repository is private

**Why.** Agents guess when a fact is missing, and a wrong domain fact is worse
than a missing feature because it is invisible. Having the source documents in
the repository means a fact can be checked rather than invented.

**Cost.** The repository can never be made public without removing that folder
and rewriting history. It holds a client's tender enquiry, an architect's
copyrighted drawings, a contractor's own rates, and third parties' contact
details.

---

### D-15 — Clause references are data, not code

**Why.** They were transcribed from a tender pack and a process flowchart, not
from the published JBCC agreements, and are not yet verified. Keeping them in a
table means verification is a data change reviewed by someone who knows the
contract, rather than a code change reviewed by someone who does not.
