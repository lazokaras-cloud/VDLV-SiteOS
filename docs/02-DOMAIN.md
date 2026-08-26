# Domain model

The entities, in the order the business meets them. Field names here are the
contract: use them exactly.

Money is integer **cents**. Dates are `YYYY-MM-DD` strings. Durations carry their
unit in the type (`WorkingDays` / `CalendarDays`).

---

## Core types

```ts
type ISODate = string;                 // "2026-08-24", no timezone meaning
type Cents   = number & { __cents: true };
type WorkingDays  = number & { __wd: true };
type CalendarDays = number & { __cd: true };

type ContractEdition =
  | "JBCC_2005_03" | "JBCC_2007_07" | "JBCC_2014_03"
  | "JBCC_2018_05" | "JBCC_MINOR_WORKS";

type Allocation = "time" | "value" | "fixed";
```

---

## Calendar

```ts
interface Calendar {
  publicHolidays: ISODate[];           // computed per year, see rules §1.2
  shutdowns: { from: ISODate; to: ISODate; reason: string }[];  // per contract
}
```

A calendar belongs to a **contract**, not to the company. Two live projects can
carry different builders' break dates.

---

## Tender

```ts
interface Tender {
  id: string;
  ref: string;                          // the QS reference
  name: string;
  projectType: ProjectType;             // drives edition, payment days, guarantee
  state: TenderState;                   // nine states, rules §7.1
  director: PersonId;                   // allocated by rotation
  qs: OrganisationId;
  closesAt: ISODate;
  closesTime: string;                   // "10h00"
  addenda: Addendum[];
  pack: Drawing[];
  bills: Bill[];
  packages: Package[];
  qualifications: Qualification[];
  preliminaries: PrelimLine[];
  contractPeriodMonths: number;
}

interface Addendum {
  no: number;
  issuedAt: ISODate;
  effect: string;
  acknowledgeWithinHours: number;       // typically 72
  acknowledgedAt: ISODate | null;
  mustBeIncludedInTender: boolean;      // nearly always true
}

interface Drawing {
  number: string;                       // "SC-FD-01"
  title: string;
  discipline: "architectural" | "structural" | "civil" | "services";
  issuedRevision: string;               // "E"
  pricedAgainstRevision: string | null; // "D" → superseded, flag it
}
```

**Rule:** when `issuedRevision !== pricedAgainstRevision`, every rate derived from
that drawing is priced against a building that no longer exists. Surface it.

---

## Bill of quantities

```ts
interface Bill {
  no: string;                           // "3"
  name: string;                         // "Concrete, formwork and reinforcing"
  source: "sub_rates" | "build_up" | "pqs_allowance" | "calculated";
  items: BillItem[];
  amount: Cents;                        // Σ items, must reconcile
}

interface BillItem {
  item: string;                         // "1", "A", "92"
  description: string;
  unit: string;                         // "m2", "m3", "Item", "%IT", "kg"
  quantity: number;
  rate: Cents | null;
  amount: Cents;
  provenance: RateProvenance | null;    // never null on a committed rate
}

interface RateProvenance {
  kind: "sub_quote" | "build_up" | "pqs_allowance";
  subContractorId?: OrganisationId;
  quotedAt?: ISODate;
  drawingRevisions: Record<string, string>;  // what it was priced against
  committedBy: PersonId;
  committedAt: ISODate;
}
```

**Provenance is the feature.** A committed rate must carry who quoted it, when,
and against which drawing revisions. Without it, re-pricing after an addendum is
guesswork, which is exactly what happens today when rates are re-keyed by hand.

### Provisional sums

```ts
interface ProvisionalSum {
  billItem: string;
  description: string;
  amount: Cents;
  profitLine:     { rate: number | null; amount: Cents };  // %IT
  attendanceLine: { rate: number | null; amount: Cents };  // %IT
  decidedBy: PersonId | null;           // must not be null at tender lock
  decisionNote: string | null;
}
```

**Gate:** a tender cannot be locked while any provisional sum has an undecided
profit or attendance line. Zero is a valid decision; absence of a decision is not.

### Rate build-up

```ts
interface RateBuildUp {
  trade: string;
  unit: string;
  quantity: number;
  components: { label: string; kind: "material" | "labour" | "plant"; rate: Cents }[];
  markup: number;                       // 0.10
}
```

Store components. Never collapse to a single rate. See rules §4.5.

---

## Package and quote

```ts
interface Package {
  trade: string;
  billNos: string[];
  invited: OrganisationId[];
  quotes: Quote[];
  committedQuoteId: string | null;
  note: string;
}

interface Quote {
  id: string;
  subContractorId: OrganisationId;
  receivedAt: ISODate;
  lines: { billItem: string; rate: Cents }[];
  total: Cents;
  compliant: boolean;
  nonComplianceReason?: string;
}
```

Taking other than the lowest is normal and must be recorded with a reason.
Lead time, programme compliance and past performance are all legitimate.

---

## Baseline

```ts
interface Baseline {
  ref: string;                          // "T-119"
  lockedAt: ISODate;
  contractValue: Cents;
  preliminaries: Cents;
  contingency: Cents;
  programmeWeeks: number;
  margin: number;                       // 0.068
  qualifications: Qualification[];
  readonly: true;
}
```

**Immutable after creation.** No update path. If it is wrong, the project is
re-baselined as an explicit, recorded, exceptional act with a reason.

---

## Project

```ts
interface Project {
  id: string;
  name: string;
  town: string;
  clientId: OrganisationId;
  edition: ContractEdition;             // immutable
  calendar: Calendar;
  baseline: Baseline;
  stage: "tender" | "baseline" | "site" | "claims" | "completion" | "final";
  siteAgent: PersonId;
  contractsManager: PersonId;
  controlPoints: ControlPoint[];        // exactly 48
  actual: {
    contractValue: Cents;
    margin: number;
    practicalCompletion: ISODate;
    costToComplete: Cents;
    certified: Cents;
    retention: Cents;
    contra: Cents;
  };
}

interface ControlPoint {
  no: number;                           // 1..48
  phase: "before_site" | "on_site";     // 21 and 27
  description: string;
  owner: PersonId;
  targetDate: ISODate;
  recurrence: "once" | "daily" | "weekly" | "monthly";
  complete: boolean;                    // binary, no percentage
}
```

---

## Events and clocks

The clock is the heart of the system. It is **derived**, never stored as a
countdown.

```ts
interface ContractEvent {
  id: string;
  projectId: string;
  kind: "instruction" | "delay_aware" | "practical_completion"
      | "works_completion" | "certificate_approved" | "default_notice"
      | "claim_submitted" | "final_account_issued" | "site_handover";
  occurredAt: ISODate;
  ref?: string;                         // "SI-114"
}

interface Clock {
  event: ContractEvent;
  obligation: string;                   // "Notice to principal agent"
  dueAt: ISODate;                       // computed
  basis: string;                        // "20 wd, JBCC 2018, recovery of expense"
  workingDaysRemaining: WorkingDays;    // computed against "as at"
  atStake: Cents;
  onMiss: "deemed_refused" | "deemed_complete" | "right_lost"
        | "penalty" | "interest_lost";
}
```

`deriveClocks(project, events, asAt)` is a pure function. Everything on every
screen that counts down comes from it.

---

## Outputs

Everything the site produces. The register is a by-product, not a task.

```ts
interface Output {
  ref: string;                          // "SI-114 / VO-118"
  kind: "variation" | "claim" | "notice" | "progress_report"
      | "default_notice" | "final_account";
  projectId: string;
  raisedAt: ISODate;
  raisedBy: PersonId;
  amount: Cents;
  status: OutputStatus;
  respondByAt: ISODate | null;
  evidence: Evidence[];
}

interface Evidence {
  kind: "photo" | "daywork_sheet" | "delivery_note" | "diary_entry";
  capturedAt: string;                   // instant, this one has a time
  geo?: { lat: number; lng: number };
  immutable: true;
}
```

---

## Preliminaries

```ts
interface PrelimLine {
  label: string;
  allocation: Allocation;               // time | value | fixed
  amount: Cents;
}
```

Derived, never stored:

```
timeRelatedTotal     = Σ amount where allocation = "time"
timeRelatedPerMonth  = timeRelatedTotal / contractPeriodMonths
eotRecovery(days)    = timeRelatedPerMonth × (days / workingDaysPerMonth)
```

See rules §5. This is the basis of every extension of time claim.

---

## Knowledge graph

Not a separate store. A projection over everything above.

Nodes: project, output, clock, clause, edition, person, supplier, trade,
variance, material, activity, warning, recovery, tender, closed project, lesson,
benchmark, standard, client, place.

Edges carry a relation and an optional `risk` flag: `signed under`, `runs`,
`supplies`, `in default on`, `raised on`, `counted under`, `learned on`,
`changed`, `enforced on`.

The point is that a lesson from a closed project and the standard it changed sit
one hop apart. That is what it looks like when a company learns something.

---

## Identity

`Person`, `Organisation` (client, QS, sub-contractor, supplier, consultant) with
roles per project. Nothing exotic. Roles matter, names do not: authorisation is
by role and value limit.
