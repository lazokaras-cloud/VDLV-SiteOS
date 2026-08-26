# The rules engine specification

This is the most important document in the repository. Everything else is
scaffolding around it.

Every constant here is real. Several look arbitrary and are not. Do not round,
simplify or "correct" a number because it looks odd next to its neighbours: the
oddness is usually the point, and it is usually where the money is.

Each rule below carries its source. When you implement one, copy the source into
a comment above it.

> **Verification status.** These figures are transcribed from a real tender pack,
> a real priced bill of quantities, a contractor's preliminaries workbook and a
> process flowchart. They have **not** been checked line by line against the
> published JBCC agreements. Before this software is relied on commercially,
> every clause reference in section 3 must be verified against the executed
> contract for the specific project. Build the engine so that is a data change,
> not a code change.

---

## 1. Time

### 1.1 Working days

A working day is a day that is **not** a Saturday, **not** a Sunday, **not** a
South African public holiday, and **not** inside a contractual shutdown.

```
isWorkingDay(d, calendar) =
  d.weekday ∉ {Sat, Sun}
  ∧ d ∉ calendar.publicHolidays
  ∧ ¬∃ b ∈ calendar.shutdowns : b.from ≤ d ≤ b.to
```

Counting is **exclusive of the start date, inclusive of the end date**. "Twenty
working days from the instruction" means the instruction date does not count and
the twentieth working day after it does.

### 1.2 South African public holidays

Fixed dates: 1 Jan, 21 Mar, 27 Apr, 1 May, 16 Jun, 9 Aug, 24 Sep, 16 Dec,
25 Dec, 26 Dec. Moveable: Good Friday, Family Day (Easter Monday).

**The observed-Monday rule:** when a public holiday falls on a Sunday, the
following Monday is a public holiday. This is the Public Holidays Act. It does
*not* apply to Saturdays. Getting this wrong shifts deadlines by a day roughly
twice a year.

Do not hardcode a year's list. Compute from the rules, including Easter, and
allow an override table for anything a specific contract adds.

### 1.3 Contractual shutdowns

The industry builders' break is **not** a public holiday. It is a shutdown period
carried in the tender qualifications and therefore in the contract, typically
mid-December to mid-January, published annually by the regional master builders
association.

This is the single most commonly wrong thing in construction deadline
arithmetic.

**Golden test:** with a shutdown of 12 Dec 2025 to 12 Jan 2026 inclusive,

```
workingDaysBetween(2025-12-10, 2026-01-20) === 7
```

Without the shutdown the same span is 25. A claim window calculated the naive way
across year end is wrong by eighteen working days, in the direction that loses the
claim.

Shutdowns are **per contract**, not global. Two live projects can carry different
break dates.

### 1.4 Calendar days

Some periods are calendar days, not working days, and mixing them is a defect.
Notably the defects liability period and sub-contractor payment terms. Where a
period is calendar days this document says so explicitly. Where it does not say,
it is working days.

---

## 2. Contract edition resolution

The edition is **not** a choice. It is a lookup from the type of project, and it
determines the payment terms and the guarantee percentage as well.

| Project type | Agreement | Payment days | Guarantee |
| --- | --- | ---: | ---: |
| Alterations | JBCC 2000 March 2005 | 7 | 12.5% |
| Offices | JBCC 2000 July 2007 | 7 | 10.0% |
| Warehouses | JBCC 2000 March 2014 | 14 | 10.0% |
| Schools | JBCC PBA May 2018 | 14 | 10.0% |
| Hospitals | JBCC Minor Works | 7 | 10.0% |
| Retail | By negotiation | 0 | 0 |

*Source: contractor's tender workbook, "P&G Master" sheet.*

**Consequence to internalise:** a single contractor runs several editions
concurrently, because each live project runs on the edition it was signed under
and a building contract lasts years. Every deadline must therefore be computed
per project from that project's edition. There is no company-wide default and a
user must never be asked to remember which applies.

The edition is set once, at contract award, and is immutable thereafter.

---

## 3. Contractual deadlines by edition

`wd` = working days, `cd` = calendar days.

### 3.1 Recovery of expense and loss (variations)

| Step | Period | Consequence of missing it |
| --- | --- | --- |
| Notice to principal agent | 20 wd from becoming aware of the expense | Claim is out of time regardless of merit |
| Priced claim submitted | 40 wd following the notice | Claim falls away |
| Principal agent must act | 20 wd from the claim | **Deemed refused** |

A deemed refusal is a *useful* outcome, not a failure: it converts silence into
a dispute the contractor can run. The system must detect it and open the dispute
record automatically.

### 3.2 Revision of the date for practical completion (extension of time)

| Step | Period |
| --- | --- |
| Notice to principal agent | 20 wd from becoming aware of the delay |
| Revised claim submitted | 40 wd from when the contractor can quantify the delay |
| Principal agent must act | 20 wd, else deemed refused |

The contractor must also take reasonable steps to avoid or reduce delay, and
give notice of disagreement where he disputes the response.

**Time and money are separate claims.** An instruction that costs both requires
both a recovery-of-expense claim and an extension-of-time claim. Most
contractors claim the money and forget the days, and the days are usually worth
more. See §5.3.

### 3.3 Practical completion

| | July 2007 | March 2014 | May 2018 |
| --- | --- | --- | --- |
| Clause | 24 | 19 | 19 |
| Notice before inspection | 5 wd | 5 wd | 5 wd |
| PA issues list after inspection | 7 cd | 5 wd | 5 wd |
| If PA fails to issue | +5 wd notice, then deemed complete | +5 wd, then deemed | +5 wd, then deemed |
| Employer takes possession | Practical completion deemed to have occurred | same | same |

### 3.4 Works completion and defects

- Works completion list from the principal agent: **7 days after practical
  completion**.
- Not achieved within **20 wd** of the list being issued: the contractor is not
  entitled to compensatory interest. *[31.10]*
- **Defects liability period: 90 calendar days**, commencing with the issue of
  the certificate of works completion. *[25.5]*
- Principal agent issues the defects list within **7 calendar days** of the end
  of the defects liability period. *[26.4 / 21.2]*
- Contractor rectifies all final completion items **10 wd before expiry**.
- **Latent defects liability: 5 years** from the date of final completion,
  commencing at the start of the construction period. *[27.1 / 22.1]*

### 3.5 Final account

| | July 2007 | March 2014 | May 2018 |
| --- | ---: | ---: | ---: |
| PA issues final account within | **90 wd** | **90 wd** | **60 wd** |
| Contractor accepts or objects within | **45 wd** | **45 wd** | **30 wd** |
| Clause | 34.1 / 34.4 | 26.10 / 26.11 | 26.10 / 26.11 |

The contractor may request an extension. The final payment certificate is not
issued before the certificate of final completion or termination.
*[34.5 / 25.13 / 25.15]*

**This is the trap.** 90 and 45 are the numbers most people carry in their heads,
because two of the three editions use them. On a 2018 contract the windows are 60
and 30, and the final account is usually the largest single figure on the job.
The system exists substantially to prevent this specific mistake.

---

## 4. Money

### 4.1 Variation pricing

```
gross = (labour + plant + material) × 1.10
```

- Priced at **actual cost**, never at a bill rate. Pricing off a rate forfeits
  the markup, which is the contractor's margin on the variation.
- Plant includes standing time where the machine waited on the instruction.
- **A verbal instruction is not a variation.** Written instruction from the
  principal agent is a precondition.
- Substantiation required: signed daywork sheets, plant hours, delivery notes,
  photographs, site diary entry dated before the claim.

### 4.2 Sub-contractor payment

- Paid **7 calendar days** after the payment certificate is approved, **and only
  once the employer has paid**. Both conditions, not either.
- Sub-contractor rates are paid **without** the contractor's 10% markup. The
  markup is the contractor's.
- Contra charges are deducted **before** the certificate goes out. A contra
  raised after the certificate is money chased rather than money kept.
- Retention applied at the rate in the contract data, not a default.

*The pay-when-paid position is a tender qualification, not a JBCC default. It
must be inserted into the nominated and selected sub-contract conditions by the
employer. Model it as a project-level flag, defaulting off.*

### 4.3 Sub-contractor default

1. Serve written notice. Acknowledgement matters: a read receipt counts, a phone
   call does not.
2. **5 working days** to remedy.
3. Still in default: termination process opens, cost to complete goes to the
   sub-contractor's account.
4. Materials and goods on site may be used to complete the work.

### 4.4 Provisional sums and prime cost amounts

This is where the majority of a tender sum can sit, and it is widely
misunderstood.

- **Provisional sums** are budgetary allowances made by the quantity surveyor for
  work to be executed by specialists the contractor must appoint as **nominated**
  or **selected** sub-contractors.
- They are measured and valued in accordance with the JBCC agreement, and
  **deducted in whole or in part if not required, with no compensation for loss
  of profit** on the allowance.
- Prime cost amounts and provisional sums are **net**. Prime cost amounts include
  delivery to site.
- Against each provisional sum the bill carries **two separate priced lines**:
  - *Profit on the specialist executing the work*: the contractor may allow
    profit if required.
  - *Attendance on the specialist*: covers the contractor's duties provided free
    of charge to the sub-contractor, per the nominated/selected sub-contract.
- **Special attendance** is distinct from general attendance and is usually
  excluded by qualification.

**The commercial rule the system must enforce:** whenever a bill contains
provisional sums, the profit and attendance lines must be explicitly priced or
explicitly waived, by a named person, with the rand consequence shown. Leaving
them at zero by default is the largest silent giveaway in the whole process.

On a representative tender: R39.23m of provisional sums, 26 profit lines and 26
attendance lines, all zero. At 5% and 2.5% that is R2.94m on a R58.98m tender.

### 4.5 Rate build-up

When no sub-contractor will price a trade, the rate is built up:

```
netRate  = Σ(material + labour + plant + waste)
rateUsed = netRate × (1 + markup)
amount   = rateUsed × quantity
```

**Store the components, never just the resulting rate.** A built-up rate is the
only number in a bill with no third party behind it. Held as components it can be
re-costed when input prices move, checked against what the trade actually cost on
recent projects, and defended in a variation. Flattened to a single figure, all
of that is gone, which is precisely what happens when it is typed into the
estimating package by hand.

---

## 5. Preliminaries and General

### 5.1 The classification

Every preliminaries line is exactly one of:

| Allocation | Behaviour |
| --- | --- |
| **Time** | Runs per unit time for the contract period, whether or not work proceeds |
| **Value** | Scales with the contract sum |
| **Fixed** | Spent once, regardless of duration or value |

*Source: contractor's "P&G Breakdown" sheet.*

Typical time-related lines: guarantee, insurance, management and site staff,
temporary works, plant and equipment, health and safety.
Typical fixed: site establishment, site cleaning and handover.
Typical value: temporary services, contract-wide sundries.

### 5.2 The monthly rate

```
timeRelatedPerMonth = Σ(lines where allocation = time) ÷ contractPeriodMonths
```

### 5.3 Why this is the whole point

**The time-related monthly rate is the basis of every extension of time claim.**
Time-related preliminaries keep running whether or not anyone is building, so a
month of excusable delay costs the contractor a month of them and a granted
extension recovers exactly that.

Held as a single lump sum, which is how most contractors hold it, the claim
cannot be built at all. This classification is not accounting neatness. It is the
mechanism.

### 5.3b What they actually submit, which is not the same thing

Their standard breakdown to the PQS **declares every line as time related**.

That is a commercial position, not an accounting one, and it is deliberate:
time-related preliminaries are what an extension of time recovers, so a
breakdown that classifies everything as time maximises what a granted extension
is worth.

The system must therefore hold **two** classifications and never conflate them:

| | Purpose |
| --- | --- |
| **True allocation** | What the money actually behaves like. Used for internal forecasting, cost-to-complete, and knowing whether the job is winning. |
| **Submitted allocation** | What went to the principal agent in the P&G breakdown. Used for valuing a delay claim. |

Show both, label which is which, and never let one silently overwrite the other.
An agent that "corrects" the submitted breakdown to match the true one has
destroyed the basis of every extension claim on that project.

**Submission deadline: 15 working days.** The breakdown goes to the PQS within
15 working days of appointment.

### 5.4 Order of calculation

Preliminaries are calculated **last**, once every other bill is priced, because
they are a function of duration and of the value of the works. They are also the
first thing to be wrong when the programme moves, which is why the monthly rate
must be recomputed whenever the contract period changes.

### 5.5 Tender methodology

The contractor's own four steps, in order:

1. Price all tenders and qualify the start date.
2. Use the lowest rates in the adjudicator.
3. Calculate risks, escalation and the like, and add if necessary.
4. Price preliminaries and general nett.

---

## 6. Insurance and guarantees

Derived from the contract, applied for by the office at award.

- **Contract works insurance:** contract sum plus a percentage (typically 30%),
  or a fixed amount.
- **Supplementary / SASRIA:** fixed amount.
- **Performance guarantee:** percentage from the contract-type lookup in §2,
  variable or fixed, expiring on a contractual date that must be tracked.

---

## 7. State machines

### 7.1 Tender pipeline

Nine states in three phases. *Source: contractor's tender flow diagram, Rev 2.*

**Pre-tender:** `1 Upcoming` → `2 Prequalification`
**Tender:** `3 Allocation (document received)` → `4 Status` → `5 P&G summary`
**Post-tender:** `6 Awaiting result` → `7 Lowest, awaiting appointment` →
`8 Appointed` | `9 Unsuccessful`
**Exit at any point:** `Declined`

All tenders, whatever their state, are recorded in the P&G summary across all
projects. Contract directors are allocated to tenders by a rotation
("roulette") so the work is distributed evenly.

### 7.2 Project lifecycle

`Tender → Baseline → On site → Claims → Completion → Final account`

The **baseline** is created when a tender is locked and is **immutable
thereafter**. Contract value, P&G breakdown, contingency, programme and
qualifications are frozen at that moment. Everything downstream is *measured
against* the baseline, never merged into it. A budget that moves with the job
cannot tell you the job is losing money.

### 7.3 Control points

A project carries **48 control points** from tender to final account. Each has
exactly three fields:

- **Owner**: a named person
- **Target date**: recurring or once-off
- **Status**: binary, complete or incomplete

There is deliberately no "in progress" and no percentage. A step is done or it is
not. This is what makes a completion figure trustworthy and it is what makes the
progress bar honest.

Twenty-one control points fall before site handover, twenty-seven on site.

---

## 8. Award to start

Triggered by appointment, all deadline-bearing:

1. Open the contract on the accounting system (contract request form).
2. Apply for project insurances and performance guarantees per the contract.
3. Submit the **P&G breakdown within the contract-prescribed date**.
4. Generate the health and safety file per the OHS Act and the project
   specification, **before work may commence**.
5. Produce the client cashflow from the priced bill and the baseline programme.
6. Sign the site handover document and record the start date.
7. **If site handover is later than the contract date**, issue an extension of
   time notification, and an extension of time claim if completion dates are
   affected.

Item 7 is a rule, not a reminder: the system should detect the late handover from
the two dates it already holds and raise the notice itself.

---

## 9. Company operating rules

Sections 1 to 8 are the contract. This section is the **company's own process**,
carried over from their A0 flowchart. It is as binding as the contract and more
often broken, because nothing enforces it.

These are not suggestions to be configured away. They were arrived at by a
contractor over decades, usually after losing money the other way. Where a rule
looks fussy, assume it is scar tissue.

### 9.1 Drawing control

- Drawings are received **three copies per drawing**.
- The main drawing is stamped **three times**.
- Copy 1 issues to the **foreman**, who signs on the main drawing's stamp.
- Copy 2 issues to the **sub-contractor**, who signs and dates.
- The two remaining copies carry one stamp each.
- On revision: the superseded main drawing is **crossed out and filed in the
  box**, replaced by the new one. Copies of the superseded drawing are destroyed.
- Only the main drawing stays in the box, title block crossed out, with the
  **revision date written in the title block**.

**Why the system cares:** this is a manual provenance chain, and it is the same
problem as §4.5. Every rate, instruction and claim is priced against a revision.
Digitally, the rule becomes: an issued revision supersedes its predecessor
everywhere at once, and anything priced against the old one is flagged, not
silently carried forward.

### 9.2 Delivery control

- An **approved person** checks the order against the delivery, stamps the
  delivery note, writes their name and signs it.
- Approved persons' names and signatures are held at the office by the creditors
  manager. Authorisation is a list, not a habit.
- **Any discrepancy** between the order, the delivery note and what actually
  arrived is written on the delivery note at the time.
- Delivery notes are filed on site and **submitted weekly before the cut-off**.
- The office captures the delivery against the order.

**Rule to enforce:** a delivery note without an approved signatory, or submitted
after the cut-off, is an exception that must surface rather than disappear.

### 9.3 Procurement

- Material on the bulk order is drawn against it. Bulk orders are built from the
  estimating resource list.
- **Bulk order prices are fixed for 60 days.** After that they are not.
- Material not on a bulk order requires a **requisition** and **three
  quotations**.
- Items are split **critical / not critical**, and the critical ones follow the
  site procurement route rather than the office one.
- Settlement discount is taken at adjudication, not left on the table.

### 9.4 Plant, scaffold and the yard

Scaffold and plant move on paper both ways, and the paper must match the truck.

1. **Order to yard note** raised.
2. Collected from the yard against a **book-out note**, signed by a responsible
   person **against the actual scaffold on the truck**.
3. On arrival, a responsible person **checks what was offloaded against the
   book-out note**.
4. Book-out notes are submitted to the office with the delivery notes.
5. Return: **return to yard note**, then a **book-in note** signed against the
   actual scaffold on the truck.
6. Plant is **off-hired when not in use**, and a record kept of days used.

**Rule:** unreturned scaffold is a cost nobody notices until year end. Out and in
must reconcile per project, and the difference is money.

### 9.5 Labour clock

| Time | Event |
| --- | --- |
| 06h30 – 06h50 | Clock in |
| 06h50 – 07h00 | Foreman allocates tasks |
| 07h00 | Start work |
| 12h00 – 12h30 | Lunch |
| 16h00 | Clock out, **8.5 hours** |
| Fridays 15h00 | Clock out, **7.5 hours** |

- **Normal hours: 83 per fortnight.**
- Labour-only sub-contractors are paid **fortnightly**, on a **separate time
  sheet per sub-contractor**.
- **Only day wages submitted on a time sheet are paid.** No sheet, no payment.
- Labour-only measurement is reconciled against material actually delivered to
  site.
- The foreman plans the next day's production and the orders that follow from it.

### 9.6 Sub-contractor onboarding

Before a sub-contractor may start, all of:

- Company registration documents
- **Confirmation of banking details, less than 3 months old**
- Valid BBBEE certificate or certified affidavit
- Valid letter of good standing (workmen's compensation)
- Signed mandatory agreement
- OHS Act contractor appointment
- Health and safety file **audited and approved by the consultant**
- Copy of ID filed with the letter of good standing and mandatory agreement
- Proof of induction

**Gate:** this is a hard precondition. No sub-contractor works on site with an
incomplete file, and the system should make starting one impossible rather than
merely warn.

### 9.7 Nominated and selected sub-contractors

- **Nominated** sub-contractors are treated as **low risk**, **selected** as
  **high risk**. The distinction drives how much scrutiny the appointment gets.
- Tenders are scrutinised in consultation with the contractor, and a **compliant**
  tenderer is chosen. Compliant is not the same as cheapest.
- Appointment carries: appointment order, appointment letter, additional terms,
  programme, mandatory agreement, OHS appointment, letter of good standing.
- On default or insolvency, the cost of completing the works falls to the
  **employer's account** or the **contractor's account** depending on which party
  nominated, and that determination must be recorded at appointment, not argued
  about later.

### 9.8 Quality

- A **quality control list** is created and maintained through the project and
  signed off.
- Defects notified to a sub-contractor are **to be remedied within 5 working
  days**, matching §4.3.
- The **concrete cast register is updated daily**.
- **Test cubes** follow the cube process; results attach to the pour.
- Concrete and mortar **mix designs are approved by the engineer** before use.

### 9.9 Health and safety

- Appoint the health and safety consultant.
- **Notify the Department of Labour of construction work.**
- Obtain the safety specification from the client; it forms part of the contract.
- Implement the health and safety file **before work commences**.
- Appoint a health and safety representative on site.
- Keep the safety file and toolbox talks current.
- **Induction** before anyone works: sticker on the safety vest as proof.
- **PPE: hard hat, vest, overall, safety shoes.** Company clothing compulsory.
- Sub-contractor files audited by the consultant **before they can start**.

### 9.10 Claim procedure

In order, monthly:

1. Receive sub-contractors' claims.
2. **Measure own work and reconcile against actual cost in the cost report.**
   Allowable against actual is where the saving shows.
3. Prepare the monthly claim.
4. The PQS approves and certifies.
5. Invoice the client.
6. **Adjust the claim against the approved certificate**, to the certified
   quantities and rates.
7. On payment, adjust the claim sheet accordingly.
8. Confirm new rates are paid **without the 10% markup** (§4.2).
9. Confirm **contra charges are updated and deducted** before the claim goes out.

### 9.11 Site establishment

Signage including company signage and emergency numbers; entrance and gatekeeper
with a sign-in book; site offices, storage and changing areas; electrical and
plumbing reticulation; site toilets; fencing and hoarding; power tools, plant and
equipment; standard consumables.

**Site access:** a key register, and the site locked every day. Keys hand over at
practical completion.

### 9.12 Reporting and meetings

- **Replies to the previous minutes are given before the meeting**, not in it.
- Weekly programme and sub-contractor meetings.
- **RFIs updated daily.** An RFI open past its turnaround is a delay event in
  waiting (§3.2).
- Progress photographs.
- **Weather records from a rain meter**: the evidence base for weather delay.
- Site instruction book for urgent information.
- The progress report is written **against the previous report**, never from
  scratch.

### 9.13 Doors, frames and ironmongery

One named person owns frames, doors and ironmongery for the whole project. The
final schedule is compared against the original BoQ items, and **variation orders
are raised for new items before the order is placed**, not after.

This looks trivially specific. It is here because it is a repeat offender: a
long-lead, high-value package with a schedule that drifts from the bill.

### 9.14 Insurances

- All contractor insurances, with an insurance cover letter.
- All insurances held with the client, with a letter to the client.
- Insurances after practical completion, with a completion letter to the client.

### 9.15 Statutory inspections

Obtain the list of documents and inspections the building inspector requires;
arrange the inspections for occupation; submit the documents and inspection
results to the principal agent.

### 9.16 Project close-out

Nine points, all required:

1. Final completion certificate and final account
2. **Project feedback recorded**: this is what feeds §7 benchmarks and lessons
3. Sub-contractor retention report signed off
4. All suppliers paid, no accruals
5. All outstanding invoices, including pro-forma, cleared
6. Sell-by-loss journal on the cost centre
7. **Cost centre signed off by the contracts manager and a director**
8. **Guarantee cancelled**: an uncancelled guarantee is a live liability
9. Contract closure meeting

**Rule:** a project is not closed until all nine are true. Item 2 is the one
always skipped, and it is the one that makes the next tender better.

### 9.17 Creditors and the cost ledger

Cost moves through three states, and the responsibility changes at each.

| State | Owner | Trigger |
| --- | --- | --- |
| **Committed** | Contracts manager | Purchase order raised against a quote |
| **Accrual** | Creditors clerk | Delivery taken against the order |
| **Cost** | Finance | Invoice processed against order and delivery |

- The order is raised **as per the quote**, with three quotations where the
  material is not on a bulk order.
- Delivery notes are submitted **every Friday**.
- Any discrepancy between order, delivery note and invoice is written on the
  invoice at the time.
- Rate and quantity differences are resolved by **requesting a credit note**, not
  by absorbing them.

An order with no delivery is a committed cost that never becomes an accrual, and
it is invisible in a cost report that only shows invoices. That gap is where a
job quietly loses money between claims.

### 9.18 Concrete

- The cast register is updated **with every pour**, and again with the test cube
  result when it arrives.
- Cube sampling follows the standard sampling procedure.
- Concrete is measured accurately by the responsible person for the pour.
- Mix designs are approved by the engineer before use.

### 9.19 Advance payments to sub-contractors

Not a favour and not a cash-flow accident. It is a deliberate trade: pay the
sub-contractor early, and take the settlement discount they give for it as a
contra charge. It is one of the few places in the business where money is made
by moving a date.

**The limits are hard numbers.**

| Limit | Amount |
| --- | --- |
| Per division | R3 750 000 |
| Per client | R3 750 000 |
| Extended ceiling, either limit | R7 500 000 |
| Global limit across the group | R30 000 000 |

Going past R3.75m requires the division director to motivate **by email to the
profit share partners**, stating that the risk was assessed and found low, and
citing the client's payment record and the contract or agreed payment terms. If
that client then pays late, the extended limit may be withdrawn permanently.

**The procedure, and every step of it is a control.**

1. Issue the sub-contractor payment advice **against the certificate number on
   which the work will be claimed from the client**, not the last one paid. If
   certificate 2 was the last paid and the advance covers work going onto
   certificate 3, the advice and the remittance are both certificate 3.
2. The settlement discount received is **deducted from the payment as a contra
   charge**, always to the dedicated settlement-discount ledger code. Only
   settlement discount goes to that code. Other contra charges on the same
   document are split to their own codes.
3. Print the contra charge invoice and attach it to the payment advice.
4. Obtain the sub-contractor's invoice before paying, and attach it.
5. Sign next to the certificate number and write **ADVANCE PAYMENT** beside the
   signature.
6. **Only a director may sign an advance payment.**
7. Update the advance payment register and forward it so the master is updated.
8. The advance must be in the budget **on the Thursday before payment**.

The discount is tracked per director and reconciled to the ledger. A discount
banked but never certified by the client is an open exposure, which is why the
register carries the client payment date, whether the client was invoiced, and
whether the contra charge was raised.

### 9.20 People

Performance of the project team is rated **yearly**, and the rating drives
increases and bonuses. The measure that matters and cannot be usefully gamed is
**notices served inside the contractual window**: a site agent who games that is
a site agent who never misses a claim.

---

## 10. The recipe

The contractor calls this "our recipe": the sequence by which a job makes money.
It is not advice. It is the commercial model the product exists to enforce, and
almost every feature is a step in it.

### 10.1 The tender is priced to win, not to profit

```
nett price + P&G + risk = tender price
```

- Price the bill **nett**: no profit in the rates, cheapest rates throughout.
- Allow for everything in the P&G calculation, because that is where the money
  is carried.
- Add risk explicitly, for example the gap between the lowest sub-contractor
  price and the second lowest, since taking the lowest is taking that risk.

**The consequence, and it is the whole thesis:** the tender frequently contains
little or no profit. The job is therefore not made profitable by winning it. It
is made profitable by everything that happens next.

### 10.2 Re-engineering: money is made before work starts

The single highest-leverage window in the whole process, and it is measured in
days.

- Beat **every** resource price used in the tender: material, plant, labour.
- Better sub-contractor prices than the tender allowable.
- Settlement discounts from all domestic sub-contractors.
- **All domestic appointments within the first week after appointment.**
- **All material bulk orders within the first week after appointment.**
- Communicate the total saving on appointments and bulk orders to every contracts
  manager, so the benchmark moves for the next job.

A week is the whole opportunity. A system that surfaces "you are on day 4 of 7
and 6 of 14 packages are unappointed" is worth more than most of the reporting in
this product.

### 10.3 Bulk orders

- Built from the estimating resource list.
- **Prices are fixed for the project.** The order states that quantities may
  change, and that the contractor may cancel at any time with no obligation to
  complete.
- **Any order not on a bulk order is one of three things: a variation, a contra
  charge, or a P&G item.** Nothing else. That is a classification rule, and an
  order that cannot be placed in one of those three boxes is an error to raise
  rather than a cost to absorb.
- Material not on a bulk order requires a requisition and three quotations.

### 10.4 Provisional sums, priced domestically

- Draft the nominated and selected appointment dates onto the RFI list from the
  provisional sums in the bill.
- Price the provisional work with a **domestic** sub-contractor, then submit the
  cheap price plus the mark-up as the contractor's own.
- Agree with the PQS **at the outset and in writing** that a 10% allowance
  applies to additional or new trades under provisional sums.

This answers the puzzle in §4.4. The profit and attendance lines in the bill sit
at zero not because the margin was given away, but because it is taken through
the domestic price and the separately agreed allowance. The system should show
both, so the decision is visible rather than inferred.

### 10.5 The claim cycle

Monthly, and described by the contractor as the most important part of the job.

- Use the cost report **including accruals**: every cost incurred must be covered
  by the claim, whether or not the invoice has arrived.
- Every extra and variation is cost of material, plant, labour and waste, **plus
  10%**.
- Sub-contractor claims go on the claim sheet **plus 10%** on all new items.
- Own work is claimed from the cost report's actual quantities, **plus 10%** on
  all new items.
- Adjust the monthly claim to the PQS valuation once certified.

### 10.6 Paying sub-contractors

Four rules, all of them money:

1. Pay **the lesser of** the PQS certified quantity and the sub-contractor's
   claimed quantity. Never the greater, and never simply what was claimed.
2. **Always deduct the 10% mark-up from the certified rate.** The certified rate
   includes the contractor's mark-up; the sub-contractor is not entitled to it.
3. Pay only once the client has paid.
4. **A director approves payments.**

Contra charges are invoiced separately with the claim sheet as backing.

### 10.7 Retention and guarantees

- Where the contract allows the choice, **avoid a performance guarantee so that
  the 10% retention is retained instead.** Retention held is leverage; a
  guarantee is a cost.
- Do not overpay sub-contractors or release retention early. Keep enough
  financial leverage to have the work finished and closed out properly.
- Track every guarantee from issue to expiry or release, and **actively pursue
  the release** rather than letting it stand.
- At practical completion, send the certificate onward so the variable guarantee
  can be reduced and the insurance adjusted.
- Never sign a waiver of lien without a valid payment guarantee or a direct
  payment arrangement from the bank.

### 10.8 Cash flow

- Client terms are typically 7 to 14 days from certificate date; watch for
  contracts that differ.
- Suppliers are typically on 30-day terms.
- Sub-contractors are paid after the client has paid.

The gap between those three is working capital, and it is deliberate. Claim
quickly, bank quickly, and use the supplier terms to earn settlement discount.

### 10.9 The admin rhythm

Fixed cadence. These are the recurring control points from §7.3.

| Cadence | What |
| --- | --- |
| **Daily** | RFI update |
| **Weekly, Friday before end of day** | Programme update |
| **Weekly** | Contra charge register updated, report printed for the monthly deduction |
| **Weekly** | Progress photographs with the meeting pack: programme, RFI, concrete cast register, photographs |
| **Every pour** | Concrete cast register, updated with the pour and its test cube result |
| **Monthly** | Claim cycle, cost report review |

The cost report review is called out by the contractor as one of the most
important controls on the project. It is monthly and it is not optional.

### 10.10 Site standards

Held as non-negotiable, and they are about trust rather than tidiness.

- Safety induction, with induction stickers and vests. Non-negotiable.
- Housekeeping. Non-negotiable, because quality and a satisfied client depend on
  a clean site.
- Company signage on the site corners in both directions; clean vehicles;
  company clothing and PPE.
- Website and social media updated at least every 30 days.

---

## 11. Rules that must never be relaxed

- No language model output reaches any of the above.
- Every deadline is computed from the project's own contract edition.
- Working days and calendar days are distinct types.
- Money is integer cents.
- The baseline is immutable.
- Provisional sum profit and attendance are explicit decisions.
- A built-up rate is stored as its components.
