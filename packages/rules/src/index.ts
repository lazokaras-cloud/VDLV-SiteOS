/**
 * The rules engine.
 *
 * Pure, deterministic, and free of dependencies. Every number a user relies on
 * comes from here. Read AGENTS.md §1 and §2 before adding anything.
 *
 * Modules arrive with their tickets, see docs/05-WORKSTREAMS.md:
 *   calendar.ts      RULES-01  working days, holidays, shutdowns
 *   editions.ts      RULES-02  the edition table and the project-type lookup
 *   clocks.ts        RULES-04  deriveClocks(), every countdown in the product
 *   variation.ts     RULES-05  pricing, markup, substantiation gates
 *   payment.ts       RULES-06  certificates, retention, contra, sub terms
 *   preliminaries.ts RULES-07  time/value/fixed, monthly rate, EOT recovery
 *   boq.ts           RULES-08  reconciliation, provisional sums, rate build-up
 *   controlpoints.ts RULES-09  the 48-point spine
 *   operating.ts     RULES-10  the company's own operating rules, rules §9
 */

export * from "./calendar.js";
