# Work breakdown for a swarm

Tickets are sized for one agent in one session. Claim a ticket by opening a draft
PR titled `[RULES-01] …` **before** starting.

The dependency shape matters: **wave 0 blocks everything**. Do not start a wave
until its predecessors are merged, or agents will build against types that move
under them.

```
wave 0   foundations        RULES-01..03, DOM-01, DB-01        ← serial-ish, do first
wave 1   the engine         RULES-04..09                        ← highly parallel
wave 2   surfaces           SITE-*, OFFICE-*, TENDER-*          ← parallel by app
wave 3   integrations       SYNC-*, IMPORT-*, AI-*
wave 4   polish             I18N-*, A11Y-*, PERF-*
```

---

## Wave 0 — foundations

Everything else builds on these. Get them right rather than fast.

**DOM-01 — Domain types and schemas**
Implement every type in `docs/02-DOMAIN.md` in `packages/domain` as TypeScript
types plus zod schemas. Branded `Cents`, `WorkingDays`, `CalendarDays`.
*Done when:* every type in the doc exists, schemas round-trip the fixtures, and
`tsc --noEmit` passes across the monorepo.
*Blocks:* everything.

**RULES-01 — Calendar**
*Scaffolded already:* `packages/rules/src/calendar.ts` has the signatures, the
sources and the counting convention; `calendar.test.ts` has the cases as `todo`.
Implement, turn the todos into tests, delete the `NOT_IMPLEMENTED` helper.
Working days, SA public holidays computed from rules including Easter and the
observed-Monday rule, contractual shutdowns. `workingDaysBetween`,
`addWorkingDays`, `isWorkingDay`.
*Done when:* every calendar case in `docs/06-ACCEPTANCE.md` §1 passes, including
the 7-working-day shutdown case. 100% branches.
*Blocks:* RULES-04, everything with a date.

**RULES-02 — Contract editions**
The edition table, the project-type lookup, and every deadline constant from
rules §3, as data with sources cited.
*Done when:* acceptance §2 passes, including 60/30 for 2018 against 90/45 for the
others.

**DB-01 — Schema and migrations**
Drizzle schema for the domain. Append-only `contract_events`. Immutable
`baselines` with no update path.
*Done when:* migrations run clean, fixtures load, and an attempted baseline
update fails at the database level.

---

## Wave 1 — the engine (parallel)

All depend on wave 0 only, so they can run concurrently.

**RULES-04 — Clocks.** `deriveClocks(project, events, asAt)` covering every
obligation in rules §3. Each clock carries basis text and an `onMiss`.
*This is the single highest-value ticket in the project.*

**RULES-05 — Variations.** Pricing, 10% markup, substantiation gates, the
written-instruction precondition, the money/time split.

**RULES-06 — Payment.** Certificates, retention, contra ordering, the
7-calendar-day-and-only-once-paid sub rule, no markup on sub rates.

**RULES-07 — Preliminaries.** Time/value/fixed, monthly rate, EOT recovery.
Acceptance §5 has the golden numbers.

**RULES-08 — Bills.** Reconciliation, provisional sums with the profit and
attendance decision gate, rate build-up storing components.

**RULES-09 — Control points.** The 48-point spine, phases, completion figure.

**RULES-10 — Company operating rules.** Rules §9: drawing control and revision
supersession, delivery-note authorisation and cut-off, procurement with three
quotations and the 60-day bulk price, scaffold out-and-in reconciliation, the
labour clock and the 83-hour fortnight, sub-contractor onboarding as a hard gate,
quality and the concrete register, health and safety preconditions, the claim
procedure ordering, and the nine-point close-out.
*This is the contractor's own process and is as binding as the contract. Do not
treat any of it as configurable.*

---

## Wave 2 — surfaces (parallel by app)

### Site app

**SITE-01 — Shell.** Tabs, offline indicator, language toggle, theme.
*In progress on `apps/site` (Next.js).*
**SITE-02 — Flow engine.** Step kinds: say, choice, number, text, checks (gating),
photo, compute, doc, finish. Persisted per step, resumable.
**SITE-03 — Today.** Lifecycle spine, baseline variance, the action list.
**SITE-04 — Variation flow.** End to end, including the "did it cost you time"
branch into an EOT claim.
**SITE-05 — Progress report flow.** Forced against last week's report.
**SITE-06 — Monthly claim flow.** Measure, reconcile, deduct, submit.
**SITE-07 — Sub-contractor default flow.** Notice, remedy, termination.
**SITE-08 — Voice capture.** Mic, transcript, field extraction, **read-back and
confirm before use**. Falls back to typed entry wherever speech is unavailable.
**SITE-09 — Evidence capture.** Photo, geotag, timestamp, immutable, queued.

### Office console

**OFFICE-01 — Shell.** Sidebar, search, sortable tables, copy-to-clipboard, deep
links, keyboard shortcuts.
**OFFICE-02 — Portfolio and project drill-down.**
**OFFICE-03..08 — The six value areas.** One ticket each: tender, procurement,
site productivity, commercial, programme, knowledge.
**OFFICE-09 — Insights.** Derived action queue, ranked by cost of ignoring.
**OFFICE-10 — Assistant.** Intent resolution over the data, answers computed by
the rules engine, pin-as-widget.
**OFFICE-11 — Knowledge graph.** Canvas force layout that settles before first
paint, drag, zoom, pan, trace, query.

### Tender workspace

**TENDER-01 — Pipeline.** Nine states, director rotation.
**TENDER-02 — Pack and revisions.** Superseded-revision detection.
**TENDER-03 — Bills and packages.** Quotes, comparison, commit with provenance.
**TENDER-04 — Rate build-up.**
**TENDER-05 — Provisional sums.** Including the profit and attendance gate.
**TENDER-06 — Preliminaries calculator.**
**TENDER-07 — Qualifications register.**
**TENDER-08 — Lock to baseline.** Creates the immutable baseline and the project.
**TENDER-09 — Award to start.** The seven-step sequence, dates derived, late
handover raising the EOT notice itself.

---

## Wave 3 — integrations

**SYNC-01 — Outbox and worker.**
**SYNC-02 — Conflict handling.** Append for events; human decides on commercial.
**IMPORT-01 — Priced bill parser.** From the estimating package's printed export
into `Bill` and `BillItem`.
**IMPORT-02 — Cost report parser.**
**EXPORT-01 — Contract request form** for the accounting package.
**AI-01 — Speech and extraction behind the `packages/ai` interface.**
**INT-WHATSAPP — WhatsApp channel MCP.** Cloud API webhook plus stdio/HTTP MCP
so an allowlisted WhatsApp inbox can store notes and documents, or launch a
Cursor cloud agent against this repository. Setup in
`packages/whatsapp-channel/README.md`. Captured files stay gitignored.

---

## Wave 4 — polish

**I18N-01 — Afrikaans catalogue**, site register per the glossary.
**I18N-02 — Afrikaans number parsing** for voice ("vier en sestig duisend twee
honderd" → 64200).
**A11Y-01 — Keyboard and screen reader**, focus states, reduced motion.
**PERF-01 — Bundle budget** for the site app on a mid-range Android over 3G.

---

## Interface contracts

Changing any of these needs agreement, not a commit. Someone is building against
them right now.

```ts
deriveClocks(project: Project, events: ContractEvent[], asAt: ISODate): Clock[]
priceVariation(input: VariationInput): VariationResult
computePreliminaries(lines: PrelimLine[], months: number): PrelimResult
reconcileBill(bill: Bill): { ok: boolean; delta: Cents }
resolveEdition(projectType: ProjectType): EditionTerms
```

## Rules of engagement

- One ticket, one PR, one blast radius. No drive-by refactors.
- If a ticket is wrong or already done, say so and stop.
- If you need a domain fact that is not in the docs, add it to
  `docs/OPEN-QUESTIONS.md` and stop. Do not guess.
- Fixtures are shared. Adding a case is welcome; changing an existing expected
  value is a red flag and needs a reason in the PR body.
