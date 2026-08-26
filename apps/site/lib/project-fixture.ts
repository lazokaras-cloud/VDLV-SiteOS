import fixture from "../../../fixtures/project-menlyn.json";

export interface ExpectClock {
  obligation: string;
  fromEvent: string;
  dueAt: string;
  workingDaysRemaining: number;
  basis: string;
}

export interface VariationCase {
  labourCents: number;
  plantCents: number;
  materialCents: number;
  expect: { netCents: number; grossCents: number };
  timeLostDays: number;
  timeRelatedPerDayCents: number;
  expectEotCents: number;
}

export interface ProjectFixture {
  id: string;
  name: string;
  town: string;
  edition: string;
  contractValueCents: number;
  asAt: string;
  events: readonly {
    kind: string;
    ref: string;
    occurredAt: string;
    note: string;
  }[];
  expectClocks: readonly ExpectClock[];
  variationCase: VariationCase;
}

export const project = fixture as ProjectFixture;

/** Contractual "today" for this demo project — never the wall clock. */
export const asAt = project.asAt;

export function eventRef(ref: string): string | undefined {
  const hit = project.events.find((e) => e.ref === ref);
  return hit?.occurredAt;
}
