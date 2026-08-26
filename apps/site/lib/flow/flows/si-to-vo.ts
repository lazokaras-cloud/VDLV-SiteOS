import { project } from "../../project-fixture";
import type { FlowDefinition } from "../types";

const vc = project.variationCase;

export const siToVoFlow: FlowDefinition = {
  id: "si_to_vo",
  titleKey: "flow.si_to_vo.title",
  clauseKey: "flow.si_to_vo.clause",
  taskId: "si114",
  guideNo: "02",
  steps: [
    {
      kind: "say",
      stageKey: "flow.stage.confirm",
      bodyKeys: ["flow.si_to_vo.intro1", "flow.si_to_vo.intro2"],
      continueKey: "flow.action.start",
    },
    {
      kind: "choice",
      stageKey: "flow.stage.confirm",
      questionKey: "flow.si_to_vo.started.q",
      bodyKey: "flow.si_to_vo.started.body",
      stateKey: "started",
      options: [
        { labelKey: "flow.si_to_vo.started.fri", value: "started", tone: "sig" },
        { labelKey: "flow.si_to_vo.started.not", value: "not" },
        { labelKey: "flow.si_to_vo.started.done", value: "done", tone: "sig" },
      ],
      afterKeys: {
        started: "flow.si_to_vo.started.afterStarted",
        done: "flow.si_to_vo.started.afterStarted",
        not: "flow.si_to_vo.started.afterNot",
      },
    },
    {
      kind: "number",
      stageKey: "flow.stage.price",
      questionKey: "flow.si_to_vo.labour",
      bodyKey: "flow.si_to_vo.price.body",
      stateKey: "labourRands",
      prefix: "R",
      defaultRands: vc.labourCents / 100,
    },
    {
      kind: "number",
      stageKey: "flow.stage.price",
      questionKey: "flow.si_to_vo.plant",
      stateKey: "plantRands",
      prefix: "R",
      defaultRands: vc.plantCents / 100,
    },
    {
      kind: "number",
      stageKey: "flow.stage.price",
      questionKey: "flow.si_to_vo.material",
      stateKey: "materialRands",
      prefix: "R",
      defaultRands: vc.materialCents / 100,
    },
    {
      kind: "choice",
      stageKey: "flow.stage.time",
      questionKey: "flow.si_to_vo.time.q",
      bodyKey: "flow.si_to_vo.time.body",
      stateKey: "delayDays",
      options: [
        { labelKey: "flow.si_to_vo.time.4", value: "4", tone: "sig" },
        { labelKey: "flow.si_to_vo.time.8", value: "8", tone: "sig" },
        { labelKey: "flow.si_to_vo.time.0", value: "0" },
      ],
    },
    {
      kind: "checks",
      stageKey: "flow.stage.check",
      bodyKey: "flow.si_to_vo.checks.body",
      items: [
        {
          key: "actualCost",
          labelKey: "flow.si_to_vo.checks.actual",
          hintKey: "flow.si_to_vo.checks.actualHint",
        },
        {
          key: "written",
          labelKey: "flow.si_to_vo.checks.written",
          hintKey: "flow.si_to_vo.checks.writtenHint",
        },
        {
          key: "photos",
          labelKey: "flow.si_to_vo.checks.photos",
          hintKey: "flow.si_to_vo.checks.photosHint",
        },
        {
          key: "daywork",
          labelKey: "flow.si_to_vo.checks.daywork",
          hintKey: "flow.si_to_vo.checks.dayworkHint",
        },
      ],
    },
    {
      kind: "doc",
      stageKey: "flow.stage.submit",
      titleKey: "flow.si_to_vo.doc.title",
      subtitleKey: "flow.si_to_vo.doc.sub",
      rowKeys: [
        { labelKey: "flow.si_to_vo.doc.instruction", valueKey: "docInstruction" },
        { labelKey: "flow.si_to_vo.doc.amount", valueKey: "docAmount" },
        { labelKey: "flow.si_to_vo.doc.noticeDue", valueKey: "docNoticeDue" },
        { labelKey: "flow.si_to_vo.doc.claimDue", valueKey: "docClaimDue" },
        { labelKey: "flow.si_to_vo.doc.delay", valueKey: "docDelay" },
      ],
      noteKey: "flow.si_to_vo.doc.note",
      submitKey: "flow.action.sendPa",
    },
    {
      kind: "finish",
      stageKey: "flow.stage.done",
      bodyKeys: ["flow.si_to_vo.finish1", "flow.si_to_vo.finish2"],
      toastKey: "flow.si_to_vo.toast",
      taskId: "si114",
    },
  ],
};
