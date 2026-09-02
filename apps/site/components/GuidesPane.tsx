"use client";

import { guideCatalog } from "../lib/flow/flows";
import type { Locale } from "../lib/locale";
import { t } from "../lib/locale";

interface GuidesPaneProps {
  locale: Locale;
  onOpenFlow: (flowId: string) => void;
}

export function GuidesPane({ locale, onOpenFlow }: GuidesPaneProps) {
  return (
    <>
      <p className="guides-lead">{t(locale, "guides.lead")}</p>
      <div className="guide-list">
        {guideCatalog.map((guide) => (
          <button
            key={guide.no}
            type="button"
            className={`card guide ${guide.soon ? "soon" : ""}`}
            disabled={guide.soon || guide.flowId === undefined}
            onClick={() => {
              if (guide.flowId !== undefined) onOpenFlow(guide.flowId);
            }}
          >
            <span className="guide-no">{guide.no}</span>
            <div>
              <h3>{t(locale, guide.titleKey)}</h3>
              <p>{t(locale, guide.bodyKey)}</p>
              {guide.soon && <span className="pill info">{t(locale, "guides.soon")}</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
