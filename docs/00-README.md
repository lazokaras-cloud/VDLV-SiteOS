# Start here

You are building **SiteOS**: a construction operating system for a South African
commercial building contractor, running from tender to final account.

There is a working prototype in this repository (`src/`, served at `/plumbline`,
`/office`, `/brief`, `/workflow`). It is a **specification you can click**, not
production code. Read it, run it, then build the real thing properly.

## Read in this order

| # | Document | Why |
| --- | --- | --- |
| — | **`AGENTS.md`** | Non-negotiable operating rules. Read first, it is short. |
| 01 | `01-PRD.md` | What we are building and for whom |
| 02 | `02-DOMAIN.md` | Entities and field names. These are the contract. |
| 03 | **`03-RULES.md`** | **The rules engine spec. The most important document here.** |
| 04 | `04-ARCHITECTURE.md` | Stack, layout, deployment |
| 05 | `05-WORKSTREAMS.md` | Tickets, waves, interface contracts |
| 06 | `06-ACCEPTANCE.md` | Golden fixtures. Every number verified. |
| 07 | `07-GLOSSARY.md` | Domain vocabulary and the Afrikaans register |
| — | `OPEN-QUESTIONS.md` | Where to put things you needed and could not find |
| — | [`knowledge/`](knowledge/README.md) | **The source documents this was specified from.** Check a fact against the original rather than guessing. Private repo only — read its handling rules first. |

If you read only one thing beyond `AGENTS.md`, read `03-RULES.md`.

## The five things to understand before writing code

**1. A language model must never produce a number a user relies on.**
Dates, deadlines, quantities, rates, percentages and rand amounts all come from
`packages/rules`, which is pure and deterministic. Models handle language:
speech to fields, fields read back, prose around numbers they were handed. A
hallucinated working-day count is not a bad answer, it is a lost claim.

**2. The contract is a per-project property, not a setting.**
Several JBCC editions run across one contractor at once because each job runs on
the edition it was signed under. The same milestone gives different deadlines on
different projects. On a 2018 contract the final account window is 60 working
days and the objection window 30; on 2007 and 2014 they are 90 and 45. Most
people carry 90 and 45 in their heads. Preventing that specific mistake is much
of why this product exists.

**3. Working days are not business days.**
Weekends, South African public holidays with the observed-Monday rule, **and the
contractual builders' break**, which is not a public holiday and lives in the
tender qualifications. 10 December to 20 January is **7 working days**, not 25.

**4. Preliminaries are classified time, value or fixed.**
That classification is the entire mechanism behind extension-of-time claims: the
time-related lines keep running whether or not anyone is building. Held as one
lump sum, as most contractors hold it, the claim cannot be built at all.

**5. The company's own process is as binding as the contract.**
Rules §9 carries the contractor's operating rules from their own process
flowchart: drawing control, delivery authorisation, three quotations, the labour
clock, the sub-contractor onboarding gate, the nine-point close-out. It was
arrived at over decades, usually after losing money the other way. Do not treat
it as configurable.

## Working as a swarm

1. Read `AGENTS.md` and `03-RULES.md`.
2. Take a ticket from `05-WORKSTREAMS.md`. **Respect the waves** — wave 0 blocks
   everything.
3. Claim it with a draft PR titled `[TICKET-ID] …` before starting.
4. Stay inside your blast radius. Two agents reformatting one file is the main
   way this goes wrong.
5. Need a domain fact that is not written down? Add it to `OPEN-QUESTIONS.md` and
   stop. Do not guess, and do not pattern-match from other construction software.

## What "done" means

- The acceptance cases in `06-ACCEPTANCE.md` pass, using the committed fixtures.
- `packages/rules` is at 100% branch coverage.
- Every new user-facing string exists in both language catalogues, or is marked
  `// TODO af`.
- No client names, real rates, or source tender documents anywhere in the repo.

## A note on the numbers

The fixtures follow a real submitted tender in shape and proportion: the bills
sum to R58 976 685.20 and the preliminaries reconcile to the rand. The names are
invented and the source documents are deliberately absent.

The clause references were transcribed from a tender pack and a process
flowchart, **not** from the published JBCC agreements. They are correct enough to
build against and must be verified against the executed contract before anyone
relies on them commercially. That is why every deadline is data, not code.
