export type FlowStepKind =
  | "say"
  | "choice"
  | "number"
  | "checks"
  | "doc"
  | "finish";

export interface FlowChoiceOption {
  labelKey: string;
  value: string;
  tone?: "primary" | "sig";
}

export interface FlowCheckItem {
  key: string;
  labelKey: string;
  hintKey: string;
}

export interface FlowDocRow {
  labelKey: string;
  value: string;
}

export interface FlowStepBase {
  kind: FlowStepKind;
  stageKey: string;
}

export interface SayStep extends FlowStepBase {
  kind: "say";
  bodyKeys: readonly string[];
  continueKey: string;
}

export interface ChoiceStep extends FlowStepBase {
  kind: "choice";
  questionKey: string;
  bodyKey?: string;
  stateKey: string;
  options: readonly FlowChoiceOption[];
  afterKeys?: Record<string, string>;
}

export interface NumberStep extends FlowStepBase {
  kind: "number";
  questionKey: string;
  bodyKey?: string;
  stateKey: string;
  prefix: string;
  defaultRands: number;
}

export interface ChecksStep extends FlowStepBase {
  kind: "checks";
  bodyKey: string;
  items: readonly FlowCheckItem[];
}

export interface DocStep extends FlowStepBase {
  kind: "doc";
  titleKey: string;
  subtitleKey: string;
  rowKeys: readonly { labelKey: string; valueKey: string }[];
  noteKey: string;
  submitKey: string;
}

export interface FinishStep extends FlowStepBase {
  kind: "finish";
  bodyKeys: readonly string[];
  toastKey: string;
  taskId: string;
}

export type FlowStep =
  | SayStep
  | ChoiceStep
  | NumberStep
  | ChecksStep
  | DocStep
  | FinishStep;

export interface FlowDefinition {
  id: string;
  titleKey: string;
  clauseKey: string;
  taskId: string;
  guideNo: string;
  steps: readonly FlowStep[];
}

export type FlowState = Record<string, string | number | boolean | undefined>;

export interface PersistedFlow {
  flowId: string;
  stepIndex: number;
  state: FlowState;
}
