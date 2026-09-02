"use client";

import { useEffect } from "react";

import { isDone } from "../lib/flow/persist";
import { formatZar } from "../lib/money";
import { asAt, project } from "../lib/project-fixture";
import type { Locale } from "../lib/locale";
import { t } from "../lib/locale";
import { LifecycleSpine } from "./LifecycleSpine";

export interface TodayTask {
  id: string;
  sev: "crit" | "warn" | "info";
  flowId?: string;
  locked?: boolean;
  tag: string;
  tagCls: string;
  titleKey: string;
  bodyKey: string;
  pillKeys: readonly { key: string; cls: string; vars?: Record<string, string> }[];
}

function buildTasks(locale: Locale): TodayTask[] {
  const vc = project.variationCase;
  const notice = project.expectClocks.find((c) => c.obligation === "Notice to principal agent");
  const remedy = project.expectClocks.find((c) => c.obligation === "Sub-contractor remedy expires");

  const rows: TodayTask[] = [
    {
      id: "si114",
      sev: "crit",
      flowId: "si_to_vo",
      tag: "SI-114",
      tagCls: "crit",
      titleKey: "task.si114.title",
      bodyKey: "task.si114.body",
      pillKeys: [
        {
          key: "task.si114.pillWd",
          cls: "crit",
          vars: { wd: String(notice?.workingDaysRemaining ?? "—") },
        },
        {
          key: "task.si114.pillMoney",
          cls: "flat",
          vars: { amount: formatZar(vc.expect.grossCents) },
        },
      ],
    },
    {
      id: "dn03",
      sev: "warn",
      flowId: "sub_default",
      locked: true,
      tag: "DN-03",
      tagCls: "warn",
      titleKey: "task.dn03.title",
      bodyKey: "task.dn03.body",
      pillKeys: [
        {
          key: "task.dn03.pillDay",
          cls: "warn",
          vars: { day: String(5 - (remedy?.workingDaysRemaining ?? 0)) },
        },
        {
          key: "task.dn03.pillWd",
          cls: "flat",
          vars: { wd: String(remedy?.workingDaysRemaining ?? "—") },
        },
      ],
    },
    {
      id: "quality",
      sev: "info",
      locked: true,
      tag: locale === "af" ? "Kwaliteit" : "Quality",
      tagCls: "info",
      titleKey: "task.quality.title",
      bodyKey: "task.quality.body",
      pillKeys: [{ key: "task.quality.pill", cls: "info" }],
    },
  ];

  return rows.filter((row) => !isDone(row.id));
}

interface TodayPaneProps {
  locale: Locale;
  onOpenFlow: (flowId: string) => void;
  onCriticalChange: (hasCritical: boolean) => void;
}

export function TodayPane({ locale, onOpenFlow, onCriticalChange }: TodayPaneProps) {
  const tasks = buildTasks(locale);
  const hasCritical = tasks.some((x) => x.sev === "crit");

  useEffect(() => {
    onCriticalChange(hasCritical);
  }, [hasCritical, onCriticalChange]);

  const notice = project.expectClocks.find((c) => c.obligation === "Notice to principal agent");

  return (
    <>
      <LifecycleSpine locale={locale} at="site" />

      <div className="clock card">
        <div className="clock-row">
          <div>
            <div className="lab">{t(locale, "today.atRisk")}</div>
            <div className="big-risk">
              {tasks.some((x) => x.sev === "crit")
                ? formatZar(project.variationCase.expect.grossCents)
                : t(locale, "today.clearTag")}
            </div>
          </div>
          <div className="clock-meta">
            <span className="lab">{t(locale, "today.asAt")}</span>
            <b>{asAt}</b>
            {notice !== undefined && (
              <span className="lab sub-meta">
                {t(locale, "today.noticeWd", { wd: String(notice.workingDaysRemaining) })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="sec">
        <span className="lab">{t(locale, "today.heading")}</span>
        <span className="lab">{t(locale, "today.openCount", { n: String(tasks.length) })}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="card clear center">
          <div className="lead">{t(locale, "today.clear")}</div>
          <p className="sub">{t(locale, "today.sub")}</p>
        </div>
      ) : (
        <div className="stack">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`card task ${task.sev}`}
              disabled={task.locked}
              onClick={() => {
                if (task.flowId !== undefined && !task.locked) onOpenFlow(task.flowId);
              }}
            >
              <i className="sev" aria-hidden />
              <div className="body">
                <div className="top">
                  <span className={`pill ${task.tagCls}`}>{task.tag}</span>
                </div>
                <h3>{t(locale, task.titleKey)}</h3>
                <p>{t(locale, task.bodyKey)}</p>
                <div className="foot">
                  {task.pillKeys.map((pill) => (
                    <span key={pill.key} className={`pill ${pill.cls}`}>
                      {t(locale, pill.key, pill.vars)}
                    </span>
                  ))}
                  <span className="go">
                    {task.locked ? t(locale, "today.soon") : t(locale, "today.open")}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="sec">
        <span className="lab">{t(locale, "today.quiet")}</span>
      </div>
      <div className="card">
        <table className="ledger">
          <tbody>
            {project.expectClocks.map((clock) => (
              <tr key={clock.obligation}>
                <td>{clock.obligation}</td>
                <td className="mono">
                  {clock.dueAt} ({clock.workingDaysRemaining} wd)
                </td>
              </tr>
            ))}
            <tr>
              <td>{t(locale, "today.finalAccount")}</td>
              <td className="mono">{t(locale, "today.finalAccountWd")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="foot-note">{t(locale, "today.footnote")}</p>
    </>
  );
}
