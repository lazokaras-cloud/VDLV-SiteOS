/**
 * RULES-01 acceptance.
 *
 * The cases below are driven by fixtures/calendar-2025-2026.json, so the
 * expected values live in one place and cannot drift from the specification.
 *
 * They are `todo` until somebody implements calendar.ts. Running `pnpm test`
 * prints them, which makes the test output the work list. When you implement a
 * function, delete the `.todo` block and uncomment the real one below it.
 *
 * Do not change an expected value to make a test pass. If you believe a fixture
 * is wrong, say why in the pull request: `node fixtures/verify.mjs` proves the
 * fixtures are self-consistent, so a disagreement is a real finding.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/calendar-2025-2026.json", import.meta.url), "utf8"),
);

describe("calendar (RULES-01)", () => {
  it("the fixture is loadable and carries its golden cases", () => {
    expect(fixture.goldenCases.length).toBeGreaterThan(0);
    expect(fixture.shutdowns[0].reason).toMatch(/builders/i);
  });

  // The one that matters most. Eighteen working days of difference.
  it.todo("workingDaysBetween 2025-12-10 to 2026-01-20 is 7, not 25");

  it.todo("a day inside the shutdown is not a working day");
  it.todo("the day after the shutdown ends is a working day");
  it.todo("a public holiday falling on a Sunday is observed on the Monday");
  it.todo("a public holiday falling on a Saturday is not moved");
  it.todo("addWorkingDays 2026-08-19 + 20 is 2026-09-16");
  it.todo("addWorkingDays 2026-08-19 + 40 is 2026-10-15");

  // Boundaries, per docs/06-ACCEPTANCE.md §1
  it.todo("counting is exclusive of the start and inclusive of the end");
  it.todo("a zero-length span is 0");
  it.todo("a start date that is itself a non-working day still counts correctly");
  it.todo("a span entirely inside a shutdown is 0");
  it.todo("two projects with different shutdowns give different answers");

  /*
  it("workingDaysBetween 2025-12-10 to 2026-01-20 is 7, not 25", () => {
    const cal = { publicHolidays: fixture.publicHolidays, shutdowns: fixture.shutdowns };
    expect(workingDaysBetween(isoDate("2025-12-10"), isoDate("2026-01-20"), cal)).toBe(7);
  });
  */
});
