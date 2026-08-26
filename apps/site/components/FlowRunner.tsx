"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { enrichFlowState } from "../lib/flow/enrich";
import { flowById } from "../lib/flow/flows";
import { clearFlow, loadFlow, markDone, saveFlow } from "../lib/flow/persist";
import type { FlowCheckItem, FlowState, FlowStep } from "../lib/flow/types";
import { formatZar } from "../lib/money";
import { project } from "../lib/project-fixture";
import type { Locale } from "../lib/locale";
import { t } from "../lib/locale";

interface FlowRunnerProps {
  locale: Locale;
  flowId: string;
  onClose: () => void;
  onFinished: () => void;
}

export function FlowRunner({ locale, flowId, onClose, onFinished }: FlowRunnerProps) {
  const flow = flowById[flowId];
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<FlowState>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [afterNote, setAfterNote] = useState<string | undefined>();

  useEffect(() => {
    if (flow === undefined) return;
    const saved = loadFlow(flowId);
    if (saved !== undefined) {
      setStepIndex(saved.stepIndex);
      setState(saved.state);
    }
  }, [flowId, flow]);

  const enriched = useMemo(() => enrichFlowState(state), [state]);

  const persist = useCallback(
    (nextIndex: number, nextState: FlowState) => {
      saveFlow(flowId, nextIndex, nextState);
    },
    [flowId],
  );

  if (flow === undefined) {
    return (
      <div className="flow-overlay">
        <p>{t(locale, "flow.missing")}</p>
        <button type="button" onClick={onClose}>{t(locale, "flow.action.back")}</button>
      </div>
    );
  }

  const step = flow.steps[stepIndex];
  if (step === undefined) {
    onClose();
    return null;
  }

  function advance(nextState: FlowState = state, nextIndex = stepIndex + 1) {
    persist(nextIndex, nextState);
    setAfterNote(undefined);
    setChecks({});
    if (nextIndex >= flow.steps.length) {
      clearFlow(flowId);
      onClose();
      return;
    }
    setState(nextState);
    setStepIndex(nextIndex);
  }

  function handleChoice(value: string, step: FlowStep) {
    if (step.kind !== "choice") return;
    const nextState = { ...state, [step.stateKey]: value };
    const afterKey = step.afterKeys?.[value];
    if (afterKey !== undefined) {
      const wd =
        project.expectClocks.find((c) => c.obligation === "Notice to principal agent")
          ?.workingDaysRemaining;
      setAfterNote(
        t(locale, afterKey, { wd: String(wd ?? "—") }),
      );
    }
    setState(nextState);
    persist(stepIndex, nextState);
  }

  function handleNumberSubmit(step: FlowStep, raw: string) {
    if (step.kind !== "number") return;
    const parsed = Number(raw.replace(/\s/g, ""));
    const nextState = { ...state, [step.stateKey]: parsed };
    setState(nextState);
    advance(nextState);
  }

  function allChecksDone(items: readonly FlowCheckItem[]): boolean {
    return items.every((item) => checks[item.key] === true);
  }

  return (
    <div className="flow-overlay">
      <header className="flow-head">
        <button type="button" className="flow-back" onClick={onClose}>
          {t(locale, "flow.action.back")}
        </button>
        <div>
          <div className="flow-stage">{t(locale, step.stageKey)}</div>
          <div className="flow-title">{t(locale, flow.titleKey)}</div>
        </div>
      </header>

      <div className="flow-body">
        {renderStep(step, locale, {
          enriched,
          afterNote,
          checks,
          setChecks,
          onSay: () => advance(),
          onChoice: (v) => handleChoice(v, step),
          onChoiceContinue: () => advance(state, stepIndex + 1),
          onNumber: (raw) => handleNumberSubmit(step, raw),
          onChecksContinue: () => advance(),
          onDocSubmit: () => advance(),
          onFinish: () => {
            if (step.kind === "finish") {
              markDone(step.taskId);
              clearFlow(flowId);
              onFinished();
              onClose();
            }
          },
          allChecksDone,
        })}
      </div>
    </div>
  );
}

interface RenderCtx {
  enriched: FlowState;
  afterNote?: string;
  checks: Record<string, boolean>;
  setChecks: (next: Record<string, boolean>) => void;
  onSay: () => void;
  onChoice: (value: string) => void;
  onChoiceContinue: () => void;
  onNumber: (raw: string) => void;
  onChecksContinue: () => void;
  onDocSubmit: () => void;
  onFinish: () => void;
  allChecksDone: (items: readonly FlowCheckItem[]) => boolean;
}

function renderStep(step: FlowStep, locale: Locale, ctx: RenderCtx) {
  switch (step.kind) {
    case "say":
      return (
        <>
          {step.bodyKeys.map((key) => (
            <p key={key} className="flow-msg">{t(locale, key)}</p>
          ))}
          <button type="button" className="opt primary full" onClick={ctx.onSay}>
            {t(locale, step.continueKey)}
          </button>
        </>
      );

    case "choice":
      return (
        <>
          {step.bodyKey !== undefined && (
            <p className="flow-msg">{t(locale, step.bodyKey)}</p>
          )}
          <h2 className="flow-q">{t(locale, step.questionKey)}</h2>
          <div className="opts">
            {step.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`opt ${opt.tone ?? ""} full`}
                onClick={() => ctx.onChoice(opt.value)}
              >
                {t(locale, opt.labelKey)}
              </button>
            ))}
          </div>
          {ctx.afterNote !== undefined && (
            <p className="flow-note">{ctx.afterNote}</p>
          )}
          {stateHasChoice(ctx.enriched, step.stateKey) && (
            <button type="button" className="opt primary full" onClick={ctx.onChoiceContinue}>
              {t(locale, "flow.action.continue")}
            </button>
          )}
        </>
      );

    case "number":
      return (
        <NumberStepView
          locale={locale}
          step={step}
          defaultValue={String(ctx.enriched[step.stateKey] ?? step.defaultRands)}
          onSubmit={ctx.onNumber}
        />
      );

    case "checks":
      return (
        <>
          <p className="flow-msg">{t(locale, step.bodyKey)}</p>
          <ul className="checklist">
            {step.items.map((item) => (
              <li key={item.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={ctx.checks[item.key] === true}
                    onChange={(e) =>
                      ctx.setChecks({ ...ctx.checks, [item.key]: e.target.checked })
                    }
                  />
                  <span>
                    <strong>{t(locale, item.labelKey)}</strong>
                    <small>{t(locale, item.hintKey)}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {ctx.allChecksDone(step.items) && (
            <button type="button" className="opt primary full" onClick={ctx.onChecksContinue}>
              {t(locale, "flow.action.continue")}
            </button>
          )}
        </>
      );

    case "doc":
      return (
        <>
          <p className="flow-msg">{t(locale, "flow.si_to_vo.doc.ready")}</p>
          <div className="doc-preview">
            <h3>{t(locale, step.titleKey)}</h3>
            <p className="doc-sub">{t(locale, step.subtitleKey)}</p>
            <table className="doc-table">
              <tbody>
                {step.rowKeys.map((row) => (
                  <tr key={row.labelKey}>
                    <td>{t(locale, row.labelKey)}</td>
                    <td>{String(ctx.enriched[row.valueKey] ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="flow-note">{t(locale, step.noteKey)}</p>
          </div>
          <button type="button" className="opt sig full" onClick={ctx.onDocSubmit}>
            {t(locale, step.submitKey)}
          </button>
        </>
      );

    case "finish":
      return (
        <>
          {step.bodyKeys.map((key) => (
            <p key={key} className="flow-msg">
              {t(locale, key, {
                gross: String(ctx.enriched.finishGross ?? formatZar(0)),
                eot: String(ctx.enriched.finishEot ?? ""),
                days: String(ctx.enriched.finishDays ?? "0"),
              })}
            </p>
          ))}
          <button type="button" className="opt primary full" onClick={ctx.onFinish}>
            {t(locale, "flow.action.backToday")}
          </button>
        </>
      );

    default:
      return null;
  }
}

function stateHasChoice(state: FlowState, key: string): boolean {
  return state[key] !== undefined && state[key] !== "";
}

function NumberStepView({
  locale,
  step,
  defaultValue,
  onSubmit,
}: {
  locale: Locale;
  step: FlowStep & { kind: "number" };
  defaultValue: string;
  onSubmit: (raw: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      {step.bodyKey !== undefined && (
        <p className="flow-msg">{t(locale, step.bodyKey)}</p>
      )}
      <h2 className="flow-q">{t(locale, step.questionKey)}</h2>
      <div className="num-field">
        <span className="num-pre">{step.prefix}</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t(locale, step.questionKey)}
        />
      </div>
      <button
        type="button"
        className="opt primary full"
        onClick={() => onSubmit(value)}
      >
        {t(locale, "flow.action.continue")}
      </button>
    </>
  );
}
