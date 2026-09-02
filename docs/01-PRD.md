# SiteOS: product requirements

## The problem, in one paragraph

Commercial building in South Africa runs on JBCC contracts whose deadlines are
counted in working days. Miss the notice window and a valid claim is worth
nothing, whatever its merit. The process that prevents this already exists at a
well-run contractor: it is written down, it is correct, and it runs to several
hundred steps across a wall chart nobody opens. No estimating package and no
accounting package tracks it, because both are systems of record for things that
have already happened. The gap is the thing that is about to stop happening, in
front of the person who can still act on it.

## Who this is for

| Role | Where they are | What they need |
| --- | --- | --- |
| Site agent | On site, one hand free, poor signal | The one thing that runs out first, and a way to deal with it in four minutes |
| Foreman | On site, often working in Afrikaans | To be walked through a process without being trained on it |
| Contracts manager | Between three sites and a bakkie | Which of his jobs is drifting off the price it was won at |
| Contracts director | Head office | Money at risk across the book of work, and which clock expires first |
| Commercial team | Head office, pre-award | To turn a tender pack into a priced bill without re-keying |
| Quantity surveyor | Head office | Provisional sums, rate build-ups, preliminaries that reconcile |

The site agent is the primary user. If the app is not usable one-handed in the
rain by someone who did not want a new system, nothing else matters.

## What we are building

Three surfaces over one rules engine and one database.

**1. The site app.** Mobile, offline-first, bilingual. A guided conversation
forces the employee through the process one question per screen while the
contractual clock runs. Voice capture where hands are busy. Photographs read
against the drawing. This is where the data comes from.

**2. The head office console.** Desktop, dense, drill-down. Every live project
against the price it was won at, organised around six value areas: tender,
procurement, site productivity, commercial, programme, knowledge. Plus an
insights board with a derived action queue and an assistant that answers from the
data.

**3. The tender workspace.** Pre-award. Tender pipeline, bills of quantities,
sub-contractor packages and rates, rate build-up, provisional sums, preliminaries
calculation, qualifications register, and the award-to-start sequence.

## Why it wins

Every competing product is a portfolio dashboard: a rollup of things that already
happened, sold to head office, ignored on site. Three things make this different
and all three are hard to copy.

1. **The contract is in the software.** Deadlines are computed per project from
   the edition that project was signed under. Nobody else does this because it
   requires knowing that the same milestone produces different dates on different
   jobs.
2. **The data comes from site, as a by-product.** Head office does not chase
   documents; they exist because the person doing the work produced them at the
   moment the clock started.
3. **It works in the user's language, offline, hands-free.** A system that forces
   a foreman into his second language on a device that needs signal is a system
   he works around.

## Scope

### In, for version one

- Working-day engine with public holidays and contractual shutdowns
- Contract edition resolution and the full deadline set per edition
- The 48-point project spine with owner, date and binary status
- Site flows: site instruction to variation, progress report, monthly claim,
  sub-contractor default, tender to baseline
- Voice capture with read-back on at least the variation flow
- Head office console over the six value areas
- Tender pipeline through nine states, bills, packages and rates, rate build-up,
  provisional sums, preliminaries with time/value/fixed allocation
- Award-to-start checklist with derived dates
- English and Afrikaans throughout
- Offline capture and sync

### Out, for version one

- Replacing the estimating package or the accounting package. We integrate. Any
  proposal to replace either is out of scope and probably fatal.
- Programme scheduling. We read a programme and measure against it; we do not
  build one.
- Automated quantity take-off from drawings.
- On-device model inference. Version one uses server inference where a model is
  needed at all, behind the same interface, so it can move on-device later.
- Multi-tenant billing, marketplace, or anything that is not the pilot.

### Explicitly not doing

- Letting a language model compute anything. See `AGENTS.md` §1.
- A "percentage complete" field anywhere. Binary status is a deliberate choice.
- A configurable workflow builder. The process is the product; a generic engine
  would be a worse product with more surface area.

## Success

The pilot is a success if, after one contract:

- No notice window is missed on a project running in the system.
- The site agent uses it without being asked to.
- At least one variation or extension claim exists that would not otherwise have
  been made, and its value exceeds the cost of the software.
- The contracts director opens the console before the monthly meeting rather than
  during it.

If the first three hold and the fourth does not, that is still a success. If the
fourth holds and the first does not, it is a failure wearing a dashboard.

## Constraints

- **South African context is not a localisation.** Public holidays, builders'
  break, JBCC, BBBEE, SASRIA, the rand, Afrikaans. These are load-bearing.
- **Poor connectivity is the normal case**, not the edge case.
- **The pilot contractor's process is the specification.** Where this document and
  their process disagree, their process is right and this document is a bug.
- Deployment on Vercel. Data in a managed Postgres. No infrastructure the pilot
  cannot have handed over.

## Risks

| Risk | Why it bites | What we do |
| --- | --- | --- |
| A wrong deadline | Destroys trust permanently and could cost a real claim | Rules engine is pure, tested to 100% branches, every constant sourced |
| Clause references unverified | We transcribed from a tender pack, not the JBCC documents | Verify against the executed contract before commercial reliance; keep them as data |
| Site agent does not adopt it | The whole thing collapses; head office data dries up | One question per screen, voice, Afrikaans, offline, four-minute flows |
| Scope drift into estimating | We lose, they have twenty years of head start | Integrate, never replace |
| Demo data mistaken for real | Embarrassing in front of a client | Fixtures are generic by construction, see `06-ACCEPTANCE.md` |

## Open questions

Tracked in `docs/OPEN-QUESTIONS.md`. Add to it rather than guessing.
