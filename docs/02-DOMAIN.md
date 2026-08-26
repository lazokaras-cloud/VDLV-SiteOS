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
  /**
   * Cadence is fixed by rules 10.9, not chosen per project:
   *   RFI                daily
   *   programme           weekly, Friday before end of day
   *   contra register     weekly
   *   progress photos     weekly, with the meeting pack
   *   concrete register   every pour
   *   claim, cost report  monthly
   */
  recurrence: "once" | "daily" | "weekly" | "monthly" | "per_pour";
  /** Weekly points that carry a cut-off inside the day. */
  cutOff: { weekday: "fri"; beforeEndOfDay: true } | null;
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

Every line carries **two** allocations, and they are not the same thing.

```ts
interface PrelimLine {
  label: string;
  /** What the money actually behaves like. Internal truth. */
  trueAllocation: Allocation;
  /** What was declared to the principal agent in the P&G breakdown. */
  submittedAllocation: Allocation;
  amount: Cents;
}

interface PrelimBreakdown {
  lines: PrelimLine[];
  contractPeriodMonths: number;
  /** 15 working days from appointment. A clock, not a task. */
  submittedAt: ISODate | null;
  submissionDueAt: ISODate;
}
```

The contractor's standard submission declares **everything** time related,
deliberately, because time-related preliminaries are what an extension of time
recovers. That is a commercial position and it must survive in the data.

Derived, never stored:

```
trueTimeTotal       = Σ amount where trueAllocation = "time"
submittedTimeTotal  = Σ amount where submittedAllocation = "time"
timeRelatedPerMonth = submittedTimeTotal / contractPeriodMonths   // claims use this
forecastPerMonth    = trueTimeTotal / contractPeriodMonths        // forecasting uses this
```

**Never let one overwrite the other.** Correcting the submitted breakdown to
match the true one destroys the basis of every delay claim on that project. See
rules §5.3b.

---

## Orders and the cost ledger

Cost moves through three states with a different owner at each. A cost report
that only shows invoices is blind to the first two, which is where a job quietly
loses money between claims.

```ts
type CostState = "committed" | "accrued" | "cost";

interface PurchaseOrder {
  ref: string;
  projectId: string;
  supplierId: OrganisationId;
  /** Off a bulk order, or its own requisition with three quotations. */
  source: { kind: "bulk_order"; bulkOrderRef: string }
        | { kind: "requisition"; quotations: Quote[] };   // exactly 3
  /**
   * Anything not on a bulk order is one of three things and never a fourth.
   * An order that fits none is an error to raise, not a cost to absorb.
   */
  offBulkClassification: "variation" | "contra_charge" | "png" | null;
  lines: { description: string; unit: string; quantity: number; rate: Cents }[];
  state: CostState;
  raisedBy: PersonId;                   // contracts manager
}

interface BulkOrder {
  ref: string;
  supplierId: OrganisationId;
  /** Fixed for the project. Quantities may change; cancellable without obligation. */
  pricesFixedForProject: true;
  quantitiesIndicative: true;
  cancellableWithoutObligation: true;
  lines: { description: string; unit: string; rate: Cents }[];
}

interface DeliveryNote {
  orderRef: string;
  receivedAt: ISODate;
  receivedBy: PersonId;                 // must be on the approved signatory list
  quantities: { description: string; quantity: number }[];
  /** Written on the note at the time, never reconstructed later. */
  discrepancy: string | null;
  submittedAt: ISODate | null;          // weekly, before the Friday cut-off
}
```

## Re-engineering

The week after appointment, where the margin is actually made. It is a countdown,
so the system models it as one.

```ts
interface ReEngineering {
  projectId: string;
  appointedAt: ISODate;
  /** Seven days from appointment. Both of these close together. */
  dueAt: ISODate;
  packages: {
    trade: string;
    tenderAllowable: Cents;
    achieved: Cents | null;
    settlementDiscountPct: number | null;
    appointedAt: ISODate | null;
  }[];
  bulkOrders: { category: string; tenderAllowable: Cents; achieved: Cents | null }[];
}
```

`saving = Σ(tenderAllowable − achieved)`, and it is announced to every contracts
manager, because the benchmark it sets is what prices the next tender.

## Sub-contractor payment

Four rules, all money. See rules §10.6.

```ts
interface SubPayment {
  subContractorId: OrganisationId;
  claimedQuantity: number;
  certifiedQuantity: number;
  /** Always the lesser. Never the greater, never simply what was claimed. */
  payableQuantity: number;
  certifiedRate: Cents;
  /** The certified rate carries the contractor's mark-up. The sub is not owed it. */
  markupDeducted: Cents;
  payableAmount: Cents;
  employerPaidAt: ISODate | null;       // pay-when-paid precondition
  approvedBy: PersonId | null;          // a director, always
  contraCharges: Cents;
}
```

## Advance payments

Paying a sub-contractor before the client has paid, in exchange for a settlement
discount. It is the one sanctioned exception to pay-when-paid, and it is fenced
by limits, a director signature and a reconciliation. See rules 9.19.

```ts
interface AdvancePayment {
  projectId: string;
  subContractorId: OrganisationId;
  /** The certificate the work will be CLAIMED on, not the last one paid. */
  certificateNo: number;
  paidAt: ISODate;
  invoiceAmount: Cents;                 // excl VAT
  discountPct: number;
  settlementDiscount: Cents;            // excl VAT, raised as a contra charge
  /** Only settlement discount posts here. Other contras split to their own codes. */
  contraLedgerCode: "20270";
  subContractorInvoiceAttached: boolean;
  contraInvoiceAttached: boolean;
  signedByDirector: PersonId | null;    // a director, never anyone else
  inBudgetThursdayBefore: boolean;
  clientInvoiced: boolean;
  clientPaymentDueAt: ISODate;
  clientPaidAt: ISODate | null;         // until set, this is open exposure
}

interface AdvancePaymentLimits {
  perDivision: Cents;                   // R3 750 000
  perClient: Cents;                     // R3 750 000
  extendedCeiling: Cents;               // R7 500 000
  globalLimit: Cents;                   // R30 000 000
  /** Required to exceed the base limit. Email, to the profit share partners. */
  extensionMotivation: {
    byDirector: PersonId;
    riskAssessedLow: true;
    clientPaymentTermsCited: string;
    sentAt: ISODate;
  } | null;
}
```

`remainingGlobalLimit = globalLimit - Sum(outstanding advances)`, recomputed
weekly. An advance that would take any of the four limits negative is refused by
the rules engine, not warned about in the interface.

## Site records

The four registers that have to exist whether or not anyone feels like keeping
them. Each is a by-product of doing the work, never a separate admin task.

```ts
interface ConcretePour {
  projectId: string;
  element: string;                      // "ground floor slab, bay 3"
  pouredAt: ISODate;
  /** Measured by the person responsible for the pour, not estimated after. */
  volumeM3: number;
  mixDesignRef: string;
  mixDesignApprovedByEngineerAt: ISODate | null;   // must precede pouredAt
  cubes: {
    sampledAt: ISODate;
    testAtDays: 7 | 28;
    resultMpa: number | null;           // arrives later, register reopens
    passed: boolean | null;
  }[];
}

interface RfiItem {
  projectId: string;
  ref: string;
  question: string;
  requiredByAt: ISODate;                // drives the appointment date, not the reverse
  raisedAt: ISODate;
  answeredAt: ISODate | null;
  /** Nominated and selected dates are drafted here from the bill provisional sums. */
  sourceProvisionalSumRef: string | null;
}

interface ContraCharge {
  projectId: string;
  againstOrganisationId: OrganisationId;
  raisedAt: ISODate;
  description: string;
  amount: Cents;
  /** Invoiced separately, with the claim sheet as backing. */
  invoicedAt: ISODate | null;
  deductedFromPaymentRef: string | null;
}

interface Guarantee {
  projectId: string;
  kind: "performance" | "payment" | "variable";
  /**
   * Where the contract allows the choice, none is issued and the 10% retention
   * is held instead. Retention is leverage; a guarantee is a cost.
   */
  issuedAt: ISODate | null;
  amount: Cents;
  reducedAt: ISODate | null;            // on practical completion
  expiresAt: ISODate | null;
  releasedAt: ISODate | null;           // pursued, not waited for
}
```

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
