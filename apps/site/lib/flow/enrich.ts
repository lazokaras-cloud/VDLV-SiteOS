import { asAt, eventRef, project } from "../project-fixture";
import { formatZar, randsToCents, variationGrossCents } from "../money";
import type { FlowState } from "./types";

export function enrichFlowState(state: FlowState): FlowState {
  const labourRands = Number(state.labourRands ?? project.variationCase.labourCents / 100);
  const plantRands = Number(state.plantRands ?? project.variationCase.plantCents / 100);
  const materialRands = Number(state.materialRands ?? project.variationCase.materialCents / 100);

  const labourCents = randsToCents(labourRands);
  const plantCents = randsToCents(plantRands);
  const materialCents = randsToCents(materialRands);
  const netCents = labourCents + plantCents + materialCents;
  const grossCents = variationGrossCents(labourCents, plantCents, materialCents);

  const noticeClock = project.expectClocks.find((c) => c.obligation === "Notice to principal agent");
  const claimClock = project.expectClocks.find((c) => c.obligation === "Priced claim");
  const delayDays = Number(state.delayDays ?? "0");
  const eotCents =
    delayDays > 0 ? delayDays * project.variationCase.timeRelatedPerDayCents : 0;

  const siDate = eventRef("SI-114") ?? "2026-08-19";

  return {
    ...state,
    labourRands,
    plantRands,
    materialRands,
    netCents,
    grossCents,
    docInstruction: `SI-114 / ${siDate}`,
    docAmount: `${formatZar(grossCents)} (net ${formatZar(netCents)} + 10%)`,
    docNoticeDue:
      noticeClock === undefined
        ? "—"
        : `${noticeClock.dueAt} (${noticeClock.workingDaysRemaining} wd left)`,
    docClaimDue: claimClock?.dueAt ?? "—",
    docDelay:
      delayDays > 0
        ? `${delayDays} wd / ${formatZar(eotCents)}`
        : "None",
    finishGross: formatZar(grossCents),
    finishEot: delayDays > 0 ? formatZar(eotCents) : "",
    finishDays: delayDays,
    asAt,
  };
}
