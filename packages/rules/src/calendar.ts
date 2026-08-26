/**
 * Working days.
 *
 * Ticket RULES-01. Specification in docs/03-RULES.md §1. Golden cases in
 * fixtures/calendar-2025-2026.json and docs/06-ACCEPTANCE.md §1.
 *
 * Nothing here may take a dependency, do I/O, or read the clock. `asAt` and the
 * calendar are always arguments. That is what makes "as at month end" free and
 * the tests deterministic. See AGENTS.md §2.
 *
 * The counting convention, which is easy to get wrong: **exclusive of the start
 * date, inclusive of the end date**. "Twenty working days from the instruction"
 * means the instruction date itself does not count and the twentieth working day
 * after it does.
 */

import type { Calendar, ISODate, WorkingDays } from "@siteos/domain";

const NOT_IMPLEMENTED = (fn: string) =>
  new Error(
    `${fn} is not implemented. This is ticket RULES-01. ` +
      `Read docs/03-RULES.md §1 and make the cases in ` +
      `fixtures/calendar-2025-2026.json pass. Do not simplify a constant ` +
      `because it looks odd: the oddness is usually where the money is.`,
  );

/**
 * A working day is not a weekend, not a public holiday, and not inside a
 * contractual shutdown.
 *
 * The shutdown is the part everyone misses. The builders' break is not a public
 * holiday: it is carried in the tender qualifications and therefore in the
 * contract, and it is per contract rather than per company.
 */
export function isWorkingDay(_date: ISODate, _calendar: Calendar): boolean {
  throw NOT_IMPLEMENTED("isWorkingDay");
}

/**
 * Working days between two dates, exclusive of `from` and inclusive of `to`.
 *
 * Golden case: with a shutdown of 12 Dec 2025 to 12 Jan 2026, the span
 * 2025-12-10 to 2026-01-20 is **7** working days. Ignoring the shutdown it is
 * 25. An eighteen day error across year end is the difference between a claim
 * and a loss.
 */
export function workingDaysBetween(
  _from: ISODate,
  _to: ISODate,
  _calendar: Calendar,
): WorkingDays {
  throw NOT_IMPLEMENTED("workingDaysBetween");
}

/**
 * The date `n` working days after `from`.
 *
 * Golden case: 2026-08-19 plus 20 working days is 2026-09-16, which is the
 * notice deadline for a site instruction issued that day.
 */
export function addWorkingDays(
  _from: ISODate,
  _n: WorkingDays,
  _calendar: Calendar,
): ISODate {
  throw NOT_IMPLEMENTED("addWorkingDays");
}

/**
 * South African public holidays for a year, computed rather than listed.
 *
 * Fixed: 1 Jan, 21 Mar, 27 Apr, 1 May, 16 Jun, 9 Aug, 24 Sep, 16 Dec, 25 Dec,
 * 26 Dec. Moveable: Good Friday and Family Day, from Easter.
 *
 * The observed-Monday rule: a public holiday falling on a **Sunday** moves the
 * holiday to the following Monday. It does not apply to Saturdays. Getting this
 * wrong shifts deadlines by a day about twice a year.
 *
 * Do not hardcode a year. An override list exists for anything a specific
 * contract adds.
 */
export function publicHolidays(_year: number): ISODate[] {
  throw NOT_IMPLEMENTED("publicHolidays");
}
