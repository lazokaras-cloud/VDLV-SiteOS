"use client";

import type { Locale } from "../lib/locale";
import { t } from "../lib/locale";

const STAGES: readonly { id: string; labelKey: string }[] = [
  { id: "tender", labelKey: "spine.tender" },
  { id: "baseline", labelKey: "spine.baseline" },
  { id: "site", labelKey: "spine.site" },
  { id: "claims", labelKey: "spine.claims" },
  { id: "completion", labelKey: "spine.completion" },
  { id: "final", labelKey: "spine.final" },
];

export function LifecycleSpine({
  locale,
  at = "site",
}: {
  locale: Locale;
  at?: string;
}) {
  const index = STAGES.findIndex((s) => s.id === at);
  return (
    <div className="spine" aria-label={t(locale, "spine.label")}>
      {STAGES.map((stage, n) => {
        const cls =
          n < index ? "past" : n === index ? "now" : "";
        return (
          <div key={stage.id} className={cls}>
            {t(locale, stage.labelKey)}
          </div>
        );
      })}
    </div>
  );
}
