# Guard rails for client-driven agents

The contractor sends build requests by WhatsApp. An agent reads them and changes
this repository. Nobody technical is necessarily in the loop at the moment the
request arrives.

That arrangement is genuinely good: the person who knows the domain is talking
directly to the thing that builds. It also fails in two specific ways, and this
document exists to stop both.

**The client cannot break the product by asking for something.** Only an agent
saying yes to the wrong thing can do that.

---

## 1. The two failure modes

**The client asks for something reasonable that is quietly wrong.**

> "Change the final account to 90 days, that's what it's always been."

They are right about their experience and wrong about this contract. Ninety is
the 2007 and 2014 figure; a 2018 contract is sixty. An agent that obliges has
just introduced a defect that loses a real claim, and nobody will report it,
because it looks like an answer.

**An agent makes the request work by weakening something.**

> Test fails → adjust the expected value.
> Type error → cast to `any`.
> Gate is in the way → remove the gate.
> Number does not match → change the fixture.

Every one of those turns a request into damage. All four are blocked
mechanically by `pnpm guard`.

---

## 2. Traffic lights

Every request gets a colour before any code is written. When in doubt, go up a
colour, never down.

### Green — build it

Presentation and convenience. Reversible, no contractual meaning.

- Wording, labels, ordering, grouping, colours, spacing
- Adding a column to a view from data already held
- Sorting, filtering, search, export
- New report or dashboard over existing numbers
- Translations and register fixes
- Anything in the prototype under `src/`

**Agent does:** builds it on a branch, opens a pull request, replies with what
changed and the preview link.

### Amber — restate it, then build it

Behaviour changes. The agent must reply first with its understanding, in one
short paragraph in plain language, and wait for a yes.

- New flow, new screen, new step in an existing flow
- Changing what a gate requires
- New field on an entity
- Anything touching what a role may approve
- Anything that changes what gets sent to a principal agent or sub-contractor

**The reply format:**

> You asked for X. I understand that to mean Y, which would change Z. It will
> not change any deadline or price. Reply *yes* and I will build it.

If the restatement comes back corrected, restate again. Two rounds of that is
cheaper than one wrong build.

### Red — stop and hand to a person

The agent does not build these, whatever the request says, however senior the
person asking. It replies, explains, and tags a human.

- Any number in `docs/03-RULES.md`: a notice period, a markup, a payment term, a
  guarantee percentage, a clause reference
- Anything that makes the baseline editable
- Anything that adds a percentage-complete field
- Anything that changes what a golden fixture expects
- Anything touching authorisation, approval limits, or who can see a project
- Deleting or weakening a validation, a gate, or a test
- Schema migrations that drop or rename a column holding data
- Anything that writes back to the estimating or accounting system
- Anything that would make the repository public, or move a document out of
  `docs/knowledge`
- Anything a language model would compute rather than the rules engine

**The refusal, which should be friendly and specific:**

> I can't change that one myself. The 60 working days comes from the contract
> edition this project runs on, and getting it wrong could cost a claim. I've
> flagged it for Tobie with a note. If the contract does say 90, that is a
> one-line data change and it will be quick.

Never refuse without saying what would unblock it.

---

## 3. Rules an agent never breaks

Ten. All mechanically enforced by `pnpm guard` except where noted.

1. **Never change a number in `docs/03-RULES.md`** because a request implies it.
   Those constants came from a contract. Changing one is a red request.
2. **Never edit a golden fixture** to make a test pass. The fixtures are hashed
   and locked; changing one needs `pnpm guard --bless` and a written reason.
3. **Never weaken a test, a gate or a type** to make something else work. If a
   gate is in the way, the gate is probably right.
4. **Never lower the coverage threshold.**
5. **Never add a dependency to `packages/rules`.**
6. **Never let a model compute** a date, deadline, quantity, rate, percentage or
   amount. See `AGENTS.md` §1.
7. **Never put client names, rates or contact details** into anything that
   ships. They live in `docs/knowledge` and nowhere else.
8. **Never commit to `main`.** Every change is a branch and a pull request, so
   every change is revertable by one person in one click.
9. **Never force-push, never rewrite history, never delete a migration.**
   *(Enforced by branch protection, not the guard script.)*
10. **Never do a bulk find-and-replace across the repository.** One ticket, one
    blast radius.

---

## 4. When a request is vague

Most WhatsApp requests are three words. That is fine and normal; the sender is
on a site, not writing a specification.

**Do not guess. Do not build the most likely interpretation.** Ask one question,
the smallest one that resolves the ambiguity, and offer a default.

> "make the claim thing better"

Bad: rebuild the claim flow.
Good:

> Which part is annoying, the measuring or the sub-contractor claims coming in
> late? If you don't mind either way I'll start with the sub claims, because
> that's where the cut-off bites.

One question. A concrete default. No jargon, no numbered options, no form.

---

## 5. When the client is wrong about their own domain

This will happen, and handling it well is most of the value of the arrangement.

They are almost always right about **what happens**. They are sometimes wrong
about **what the contract says**, because they have run twenty jobs on the 2014
edition and this one is 2018.

Never argue and never simply comply. Show the source.

> That's how it works on the 2014 jobs, and it's 90 days there. This contract is
> the 2018 edition and it says 60. I've kept 60 and put a note on the screen
> saying which edition it came from, so it's obvious. If the signed contract says
> otherwise, send me the page and I'll change it.

Then log it in `docs/OPEN-QUESTIONS.md`. A disagreement between the client and
the specification is a finding, not noise: one of the two is wrong and it matters
which.

---

## 6. What every change must carry

- **A branch and a pull request.** Never `main`.
- **A one-line why**, in the words the client used, so the next person can trace
  a decision back to a request.
- **A passing `pnpm check`** — guard, fixtures, types, coverage.
- **A revert path.** If it cannot be undone by reverting one commit, it is too
  big; split it.

---

## 7. The daily reply

At the end of a working session the agent posts one short message:

> Today: [what changed, in their words]. Waiting on you: [anything amber].
> Flagged for Tobie: [anything red]. Preview: [link].

Nothing technical. No file names. No ticket numbers. If it cannot be explained
to a contracts manager in a sentence, it was probably too big a change.

---

## 8. Setting it up

Mechanical enforcement, so none of the above depends on an agent remembering it.

**Branch protection on `main`:** require a pull request, require status checks,
block force pushes, block deletions. Settings → Branches → Add rule.

**Required checks:** `guard`, `verify`, `typecheck`, `test`.

**`CODEOWNERS`:** the rules engine, the fixtures, the specification and the
knowledge folder all require your review. See `.github/CODEOWNERS`.

**Locally, before anything:**

```bash
pnpm check      # guard + fixtures + types + coverage
```

---

## 9. The single sentence

If an agent remembers one thing:

> **Presentation is yours. Behaviour needs a yes. Numbers and gates need a
> person.**
