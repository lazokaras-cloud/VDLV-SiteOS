# Acceptance tests and golden fixtures

Every number below has been computed and checked. If your implementation
disagrees, your implementation is wrong. Do not adjust an expected value to make
a test pass without saying why in the pull request.

Fixtures live in `fixtures/`. Load them, do not retype them.

---

## 1. Calendar

Calendar under test: South African public holidays plus a contractual shutdown
from **2025-12-12 to 2026-01-12 inclusive**.

| Case | Expected |
| --- | --- |
| `workingDaysBetween("2025-12-10", "2026-01-20")` | **7** |
| Same span with the shutdown removed | **25** |
| `isWorkingDay("2025-12-20")` | `false` (shutdown) |
| `isWorkingDay("2026-01-06")` | `false` (shutdown) |
| `isWorkingDay("2026-01-13")` | `true` (day after it ends) |
| `isWorkingDay("2026-08-10")` | `false` (9 Aug fell on a Sunday, observed Monday) |
| `isWorkingDay("2026-08-09")` | `false` (Sunday) |
| `addWorkingDays("2026-08-19", 20)` | **`"2026-09-16"`** |
| `addWorkingDays("2026-08-19", 40)` | **`"2026-10-15"`** |

The first two rows are the ones that matter. An eighteen-working-day error across
year end is the difference between a claim and a loss.

**Boundary cases that must be tested:** counting is exclusive of start and
inclusive of end; a span of zero days returns 0; a start date that is itself a
non-working day; a span entirely inside a shutdown returns 0; a negative span.

---

## 2. Contract editions

| Case | Expected |
| --- | --- |
| `resolveEdition("offices")` | `JBCC_2007_07`, 7 payment days, 10.0% guarantee |
| `resolveEdition("warehouses")` | `JBCC_2014_03`, 14 days, 10.0% |
| `resolveEdition("alterations")` | `JBCC_2005_03`, 7 days, **12.5%** |
| `finalAccountWindow(JBCC_2018_05)` | **60 wd** |
| `finalAccountWindow(JBCC_2014_03)` | **90 wd** |
| `objectionWindow(JBCC_2018_05)` | **30 wd** |
| `objectionWindow(JBCC_2007_07)` | **45 wd** |

A test that asserts 90 and 45 for the 2018 edition is the specific failure this
product exists to prevent. Write it as a negative test.

---

## 3. Clocks

Fixture: `fixtures/project-menlyn.json`, `asAt = "2026-08-24"`.

Instruction `SI-114` issued **2026-08-19**, edition `JBCC_2018_05`.

| Obligation | Due | Working days remaining |
| --- | --- | --- |
| Notice to principal agent | `2026-09-16` | 17 |
| Priced claim | `2026-10-15` | 37 |
| Principal agent acts, else deemed refused | 20 wd from claim | - |

`onMiss` for the third row must be `"deemed_refused"`, and the system must raise
a dispute record rather than merely warning.

---

## 4. Variations

| Input | Expected |
| --- | --- |
| labour 64 200, plant 88 400, material 33 800 | net **186 400**, gross **205 040** |
| Same, priced off a bill rate | rejected: pricing basis must be actual cost |
| Same, verbal instruction | rejected: written instruction required |
| Time lost 4 days at 24 600 per day | **98 400**, as a *separate* extension claim |

**Float trap.** `186400 × 1.1` in IEEE floating point is
`205040.00000000003`. In cents, `18640000 × 11 / 10 = 20504000` exactly. This is
why money is integer cents, and there is a test for precisely this.

---

## 5. Preliminaries

Fixture: `fixtures/tender-lanseria.json`. Contract period **12.5 months**.

| Allocation | Expected |
| --- | ---: |
| Time related | **3 140 454.68** |
| Value related | **1 259 545.32** |
| Fixed | **664 632.40** |
| **Total** | **5 064 632.40** |
| **Time related per month** | **251 236.37** |

The total must reconcile exactly to bill 1. A reconciliation test that permits a
tolerance is not a reconciliation test.

`eotRecovery(20 working days)` at roughly 21.7 working days per month is
approximately **231 600**. Assert the monthly rate exactly; the derived recovery
may carry a documented rounding rule.

---

## 6. Bill of quantities

Fixture: `fixtures/tender-lanseria.json`.

| Bill | Expected |
| --- | ---: |
| 1 Preliminaries and General | 5 064 632.40 |
| 2 Earthworks | 326 428.00 |
| 3 Concrete, formwork and reinforcing | 11 179 069.34 |
| 4 Masonry | 1 079 286.76 |
| 5 Waterproofing | 521 472.05 |
| 6 Plaster | 807 833.90 |
| 7 Tiling | 534 306.75 |
| 8 Paint | 233 656.00 |
| 9 Provisional amounts | 39 230 000.00 |
| **Tender sum** | **58 976 685.20** |

Provisional share: **66.5%**.

### Provisional sum gate

- 26 profit lines and 26 attendance lines against bill 9.
- All currently unpriced.
- `lockTender()` must **fail** while any profit or attendance line has
  `decidedBy === null`. Setting a rate of zero with a named decider passes.
- Reported consequence at 5% profit and 2.5% attendance: **2 942 250**.

### Rate build-up

Plaster, 4 310 m², components 41.20 + 55.70 + 15.40 + 8.90 + 5.80 = **127.00**
net, markup 10% → **139.70** used → **602 107.00**.

Storing only `139.70` and discarding the components must fail review.

---

## 7. Payment

| Case | Expected |
| --- | --- |
| Certificate approved 2026-09-01, employer has not paid | sub not payable |
| Certificate approved 2026-09-01, employer paid 2026-09-03 | payable **2026-09-10** (7 calendar days from approval, both conditions met) |
| Sub rate 100 000 | paid 100 000, **no 10% markup** |
| Contra 71 500 raised after the certificate | flagged: must be deducted before |

---

## 8. Control points

48 exactly. 21 before site, 27 on site. Completion is `done / 48`, integer, no
percentage field anywhere in the model. A fixture with 47 or 49 must fail schema
validation.

---

## 9. What fixtures may contain

Fixtures are **generic by construction**. They are committed to a public
repository.

**Never:** a real client name, a real quantity surveyor or consultant name, a
real person's name or contact details, real priced rates traceable to a real
tender, or any source tender document.

**Always:** invented project and organisation names in plausible Gauteng
locations, and figures that follow a real tender in *shape and proportion* so the
arithmetic is meaningful.

The figures above satisfy this: the totals are structurally faithful and the
names are invented.

---

## 10. Test matrix

| Layer | Tool | Gate |
| --- | --- | --- |
| `packages/rules` | Vitest | **100% branch coverage**, merge blocker |
| `packages/domain` | Vitest | Schemas round-trip every fixture |
| Flows | Playwright | Each site flow start to finish, offline and online |
| Console | Playwright | Every view renders in both languages with no console errors |
| i18n | Custom lint | No bare user-facing strings; every key exists in both catalogues |
| a11y | axe in Playwright | No serious or critical violations |

A pull request touching `packages/rules` without a test that would have caught
the bug does not merge.
