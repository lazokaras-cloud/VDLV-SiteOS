/**
 * Core domain types.
 *
 * These are the ones every other package depends on, so they are here already
 * rather than waiting for DOM-01. The rest of `docs/02-DOMAIN.md` is DOM-01's
 * job: add the remaining entities and their zod schemas here.
 *
 * Rules of the road, from AGENTS.md §4:
 *   - money is integer cents, never floats
 *   - a calendar date is a string, because a contractual deadline is a date and
 *     not an instant
 *   - working days and calendar days are different things and the type system
 *     is what stops you mixing them
 */

/** A calendar date with no timezone meaning. `"2026-08-24"`. */
export type ISODate = string & { readonly __isoDate: unique symbol };

/** An instant. Only for things that genuinely happened at a time, like a photo. */
export type ISOInstant = string & { readonly __isoInstant: unique symbol };

/** Money, always integer cents. `R1 234.56` is `123456`. */
export type Cents = number & { readonly __cents: unique symbol };

/** Days that exclude weekends, public holidays and contractual shutdowns. */
export type WorkingDays = number & { readonly __workingDays: unique symbol };

/** Days as the calendar counts them. Not interchangeable with WorkingDays. */
export type CalendarDays = number & { readonly __calendarDays: unique symbol };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a calendar date, rejecting anything that is not `YYYY-MM-DD`. */
export function isoDate(value: string): ISODate {
  if (!ISO_DATE.test(value)) {
    throw new TypeError(`Not a calendar date: ${value}. Expected YYYY-MM-DD.`);
  }
  return value as ISODate;
}

/** Wrap an integer number of cents. Rejects floats, so rounding is deliberate. */
export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `Money must be integer cents, got ${value}. ` +
        `Round explicitly at the point of calculation, never by accident.`,
    );
  }
  return value as Cents;
}

export const workingDays = (n: number): WorkingDays => n as WorkingDays;
export const calendarDays = (n: number): CalendarDays => n as CalendarDays;

/**
 * Contract editions.
 *
 * Several run concurrently across one contractor, because each project runs on
 * the edition it was signed under. See docs/03-RULES.md §2.
 */
export type ContractEdition =
  | "JBCC_2005_03"
  | "JBCC_2007_07"
  | "JBCC_2014_03"
  | "JBCC_2018_05"
  | "JBCC_MINOR_WORKS"
  | "NEGOTIATED";

export type ProjectType =
  | "alterations"
  | "offices"
  | "warehouses"
  | "schools"
  | "hospitals"
  | "retail";

/** Terms that follow from the project type. A lookup, not a judgement. */
export interface EditionTerms {
  edition: ContractEdition;
  paymentDays: CalendarDays;
  guaranteePct: number;
}

/**
 * How a preliminaries line behaves.
 *
 * This is the whole mechanism behind an extension of time: `time` lines keep
 * running whether or not anyone is building, so a granted extension recovers
 * exactly them. See docs/03-RULES.md §5.
 */
export type Allocation = "time" | "value" | "fixed";

export interface PrelimLine {
  label: string;
  allocation: Allocation;
  amount: Cents;
}

/** A day the contract treats as non-working, beyond weekends and holidays. */
export interface Shutdown {
  from: ISODate;
  to: ISODate;
  reason: string;
}

/**
 * A calendar belongs to a contract, not to the company: two live projects can
 * carry different builders' break dates.
 */
export interface Calendar {
  publicHolidays: readonly ISODate[];
  shutdowns: readonly Shutdown[];
}

/** What happens when a contractual window is missed. */
export type OnMiss =
  | "deemed_refused"
  | "deemed_complete"
  | "right_lost"
  | "penalty"
  | "interest_lost";

export interface Clock {
  obligation: string;
  dueAt: ISODate;
  /** Always computed against an explicit `asAt`, never against the wall clock. */
  workingDaysRemaining: WorkingDays;
  basis: string;
  atStake: Cents;
  onMiss: OnMiss;
}
