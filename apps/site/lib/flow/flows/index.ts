import type { FlowDefinition } from "../types";
import { siToVoFlow } from "./si-to-vo";

export const flows: readonly FlowDefinition[] = [siToVoFlow];

export const flowById: Record<string, FlowDefinition> = Object.fromEntries(
  flows.map((f) => [f.id, f]),
);

export const guideCatalog: readonly {
  no: string;
  flowId?: string;
  titleKey: string;
  bodyKey: string;
  soon?: boolean;
}[] = [
  {
    no: "01",
    titleKey: "guide.tender.title",
    bodyKey: "guide.tender.body",
    soon: true,
  },
  {
    no: "02",
    flowId: "si_to_vo",
    titleKey: "guide.si_to_vo.title",
    bodyKey: "guide.si_to_vo.body",
  },
  {
    no: "03",
    titleKey: "guide.progress.title",
    bodyKey: "guide.progress.body",
    soon: true,
  },
  {
    no: "04",
    titleKey: "guide.claim.title",
    bodyKey: "guide.claim.body",
    soon: true,
  },
  {
    no: "05",
    titleKey: "guide.sub.title",
    bodyKey: "guide.sub.body",
    soon: true,
  },
];
