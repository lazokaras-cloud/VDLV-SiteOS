# Agent operating rules

Read this before writing any code. It is short on purpose. Everything here is a
hard rule, not a preference.

If you are picking up work, start at `docs/00-README.md`.

**If your instruction came from the client rather than a ticket, read
`docs/09-GUARDRAILS.md` first.** It tells you which requests you may simply
build, which need a yes before you start, and which you must hand to a person
however they were phrased. Run `pnpm guard` before you commit anything.

---

## 1. The one rule that matters

**A language model must never produce a date, a deadline, a quantity, a rate, a
percentage or a rand amount that reaches a user.**

Every one of those comes from `packages/rules`, which is pure, deterministic,
dependency-free TypeScript. A model may:

- turn speech or free text into structured fields
- read a photograph and propose values for a human to confirm
- phrase a question, or read a computed answer back out loud
- summarise, translate, or draft prose around numbers it was handed

A model may not:

- compute a working-day deadline
- decide whether a claim is in time
- price anything
- decide entitlement under a contract

A hallucinated working-day count is not a bad answer. It is a lost claim worth
more than the software. If you find yourself prompting a model for arithmetic,
you have taken a wrong turn: put it in the rules engine and write a test.

## 2. The rules engine is sacred

`packages/rules` has these properties and must keep them:

- **Zero runtime dependencies.** It must run in Node, in the browser, and one
  day inside a React Native app on a phone with no signal.
- **Pure functions.** No I/O, no clock reads, no `Date.now()`. The current date
  is always an argument. This is what makes it testable and what makes "as at"
  reporting possible.
- **100% branch coverage.** Not a target, a merge gate.
- **Every rule cites its source** in a comment: contract clause and edition, or
  the business document it came from. A rule with no source does not merge.

Read `docs/03-RULES.md` before touching it. Every constant in there is real and
several are counter-intuitive. Do not "simplify" a number because it looks odd.

## 3. Never invent domain facts

This domain has a lot of specific vocabulary and a lot of numbers that look
arbitrary and are not. If a spec does not tell you something:

- Check `docs/03-RULES.md` and `docs/07-GLOSSARY.md`.
- If it is genuinely not covered, **stop and raise it**. Add it to
  `docs/OPEN-QUESTIONS.md` with your name and what you needed.
- Do not guess. Do not pattern-match from other construction software. A wrong
  deadline is worse than a missing feature, because a missing feature is visible.

Particularly do not invent: clause numbers, notice periods, markup percentages,
payment terms, guarantee percentages, or anything about the JBCC agreement.

## 4. Money and dates

- Money is stored in **cents as integers**. Never floats. Format at the edge.
- Currency is ZAR. Format as `R1 234 567` with non-breaking thin spaces, never
  commas, because that is South African convention.
- Dates are stored as `YYYY-MM-DD` strings for calendar dates with no timezone
  meaning, which is nearly all of them here. A contractual deadline is a
  calendar date, not an instant.
- **Working days and calendar days are different types.** The codebase has
  `WorkingDays` and `CalendarDays` branded types. Do not unwrap them to `number`
  to make an error go away.

## 5. Language

The product is bilingual English and Afrikaans, and this is not decoration. A
system that forces a foreman to work in his second language is a system he works
around.

- All user-facing strings go through the i18n layer. No bare strings in
  components.
- Afrikaans here is **site register, not textbook**. Technical nouns stay
  English because that is what is actually said: notice, claim, contra, markup,
  VO, PA, SI, plant, snag. Everyday words are Afrikaans. See
  `docs/07-GLOSSARY.md` for the register and worked examples.
- If you cannot write the Afrikaans, ship the English and mark the key
  `// TODO af`. Do not machine-translate contract terms.

## 6. Offline first

The site app is used in a lift shaft, a basement and on a plot outside
Bronkhorstspruit. Assume no connection.

- Every write is queued locally and synced when possible. The UI never blocks on
  the network.
- Every flow is resumable. A dropped call, a flat battery or a two-day gap picks
  up where it left off, because a flow is state, not a form.
- Evidence (photographs) is captured with geotag and timestamp and is immutable
  once captured. If it can be edited afterwards it is worth nothing in a dispute.

## 7. Interaction rules for the site app

- One question per screen. Tap answers by default; the keyboard is the exception.
- **Nobody ever types a date.** Every deadline is derived from an event date and
  the contract edition.
- Gates that block: where a checklist must be true before submission, the submit
  control does not exist until it is. Do not offer a disabled button and an error.
- Controls say what happens: "Send to principal agent", then a confirmation that
  says it was sent. Never "Submit", never a silent success.
- Read-back on anything captured by voice, before it is used.

## 8. Code conventions

- TypeScript strict. No `any`. No non-null assertions in business logic.
- Server Components by default; `"use client"` only where interaction requires it.
- No client-side data fetching for anything a Server Component can render.
- Tests live next to the code. `*.test.ts`. Vitest.
- Commit messages explain **why**, in prose, not a conventional-commits prefix.

## 9. Working as a swarm

- Take a ticket from `docs/05-WORKSTREAMS.md` and claim it by opening a draft PR
  with the ticket ID in the title before you start.
- Respect the interface contracts in that document. If you need to change a
  shared type, raise it rather than changing it unilaterally: someone else is
  building against it right now.
- Do not refactor outside your ticket's blast radius. Two agents reformatting the
  same file is the main way swarm work goes wrong.
- If your ticket turns out to be wrong or already done, say so and stop. Do not
  invent adjacent work to fill the time.

## 10. Never ship

- Real client names, real priced rates, real contact details, or any of the
  source tender documents. The seed data is deliberately generic. See
  `docs/06-ACCEPTANCE.md` for what may and may not appear in fixtures.
- Anything that presents a computed figure as certain when the underlying rule
  is unverified. Mark it, or do not show it.
