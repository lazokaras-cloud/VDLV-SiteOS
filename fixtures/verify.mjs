// Checks that the golden fixtures are internally consistent.
//
// This is not the rules engine. It is a reference implementation of just enough
// arithmetic to prove the expected values in the fixtures are self-consistent,
// so an agent can tell the difference between "my code is wrong" and "the
// fixture is wrong". Run it before you start and whenever a fixture changes.
//
//   node fixtures/verify.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(HERE, f), "utf8"));

const cal = load("calendar-2025-2026.json");
const tender = load("tender-lanseria.json");
const project = load("project-menlyn.json");
const editions = load("editions.json");

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${label}${ok ? "" : `\n          got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

/* ---------- calendar ---------- */
const holidays = new Set(cal.publicHolidays);
const iso = (d) => d.toISOString().slice(0, 10);
const D = (s) => new Date(s + "T00:00:00Z");
const inShutdown = (d) => cal.shutdowns.some((b) => iso(d) >= b.from && iso(d) <= b.to);

const isWorkingDay = (d, useShutdowns = true) =>
  d.getUTCDay() !== 0 && d.getUTCDay() !== 6 &&
  !holidays.has(iso(d)) && (!useShutdowns || !inShutdown(d));

function workingDaysBetween(a, b, useShutdowns = true) {
  const d = D(a); let n = 0;
  while (d < D(b)) { d.setUTCDate(d.getUTCDate() + 1); if (isWorkingDay(d, useShutdowns)) n++; }
  return n;
}
function addWorkingDays(a, n) {
  const d = D(a); let left = n;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (isWorkingDay(d)) left--; }
  return iso(d);
}

console.log("\ncalendar");
for (const c of cal.goldenCases) {
  const got =
    c.fn === "workingDaysBetween" ? workingDaysBetween(c.args[0], c.args[1])
    : c.fn === "workingDaysBetweenIgnoringShutdown" ? workingDaysBetween(c.args[0], c.args[1], false)
    : c.fn === "isWorkingDay" ? isWorkingDay(D(c.args[0]))
    : c.fn === "addWorkingDays" ? addWorkingDays(c.args[0], c.args[1])
    : "unknown";
  check(`${c.fn}(${c.args.join(", ")})${c.note ? "  — " + c.note : ""}`, got, c.expect);
}

/* ---------- tender ---------- */
console.log("\ntender");
const sum = tender.billsCents.reduce((a, b) => a + b.amount, 0);
check("bills sum to the tender sum", sum, tender.expect.tenderSumCents);
check("provisional share",
  Math.round(tender.provisional.amountCents / sum * 1000) / 10,
  tender.expect.provisionalSharePct);
check("provisional profit and attendance consequence at 5% and 2.5%",
  Math.round(tender.provisional.amountCents * 0.075),
  tender.provisional.expectConsequenceAt5And2Point5Cents);

/* ---------- preliminaries ---------- */
console.log("\npreliminaries");
const P = tender.preliminaries;
const by = (k) => P.lines.filter((l) => l.allocation === k).reduce((a, l) => a + l.amount, 0);
check("time related", by("time"), P.expect.timeCents);
check("value related", by("value"), P.expect.valueCents);
check("fixed", by("fixed"), P.expect.fixedCents);
check("total", by("time") + by("value") + by("fixed"), P.expect.totalCents);
check("total reconciles to bill 1",
  by("time") + by("value") + by("fixed"),
  tender.billsCents.find((b) => b.no === "1").amount);
check("time related per month",
  Math.round(by("time") / tender.contractPeriodMonths),
  P.expect.timePerMonthCents);

/* ---------- rate build-up ---------- */
console.log("\nrate build-up");
const R = tender.rateBuildUp;
const net = R.components.reduce((a, c) => a + c.rate, 0);
const used = Math.round(net * (1 + R.markup));
check("net rate", net, R.expect.netRateCents);
check("rate used after markup", used, R.expect.rateUsedCents);
check("amount", used * R.quantity, R.expect.amountCents);

/* ---------- drawings ---------- */
console.log("\ndrawing revisions");
check("superseded drawings",
  tender.pack.filter((d) => d.issuedRevision !== d.pricedAgainstRevision).length,
  tender.expectSupersededCount);

/* ---------- clocks ---------- */
console.log("\nclocks");
const common = editions.common;
const si = project.events.find((e) => e.ref === "SI-114");
const dn = project.events.find((e) => e.ref === "DN-03");
const expect = (o) => project.expectClocks.find((c) => c.obligation === o);

let c1 = expect("Notice to principal agent");
check("notice due", addWorkingDays(si.occurredAt, common.expenseNoticeWd), c1.dueAt);
check("notice working days remaining",
  workingDaysBetween(project.asAt, c1.dueAt), c1.workingDaysRemaining);

let c2 = expect("Priced claim");
check("priced claim due", addWorkingDays(si.occurredAt, common.expenseClaimWd), c2.dueAt);
check("priced claim remaining",
  workingDaysBetween(project.asAt, c2.dueAt), c2.workingDaysRemaining);

let c3 = expect("Sub-contractor remedy expires");
check("remedy due", addWorkingDays(dn.occurredAt, common.subRemedyWd), c3.dueAt);
check("remedy remaining",
  workingDaysBetween(project.asAt, c3.dueAt), c3.workingDaysRemaining);

/* ---------- variation ---------- */
console.log("\nvariation");
const V = project.variationCase;
const netV = V.labourCents + V.plantCents + V.materialCents;
check("net", netV, V.expect.netCents);
check("gross in integer cents", netV * 11 / 10, V.expect.grossCents);
check("float would have drifted", (netV / 100) * 1.1 !== V.expect.grossCents / 100, true);
check("extension of time value",
  V.timeLostDays * V.timeRelatedPerDayCents, V.expectEotCents);

/* ---------- editions ---------- */
console.log("\neditions");
check("2018 final account window is 60 wd", editions.deadlines.JBCC_2018_05.finalAccountWd, 60);
check("2018 objection window is 30 wd",     editions.deadlines.JBCC_2018_05.objectionWd, 30);
check("2014 final account window is 90 wd", editions.deadlines.JBCC_2014_03.finalAccountWd, 90);
check("2007 objection window is 45 wd",     editions.deadlines.JBCC_2007_07.objectionWd, 45);
check("alterations carry a 12.5% guarantee",
  editions.projectTypeLookup.find((p) => p.projectType === "alterations").guaranteePct, 12.5);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
