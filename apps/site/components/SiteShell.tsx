"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { FlowRunner } from "./FlowRunner";
import { GuidesPane } from "./GuidesPane";
import { TodayPane } from "./TodayPane";
import { otherLocale, t, type Locale } from "../lib/locale";
import "./site-shell.css";

type TabId = "today" | "guides" | "money" | "board";

const TABS: TabId[] = ["today", "guides", "money", "board"];

const TAB_LABEL: Record<TabId, string> = {
  today: "tab.today",
  guides: "tab.guides",
  money: "tab.money",
  board: "tab.board",
};

const STORAGE_LANG = "siteos.lang";
const STORAGE_THEME = "siteos.theme";

function readStoredLang(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_LANG);
    return value === "af" ? "af" : "en";
  } catch {
    return "en";
  }
}

function readStoredTheme(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(STORAGE_THEME);
    if (value === "light" || value === "dark") return value;
    return null;
  } catch {
    return null;
  }
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [tab, setTab] = useState<TabId>("today");
  const [online, setOnline] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [activeFlow, setActiveFlow] = useState<string | undefined>();
  const [criticalDot, setCriticalDot] = useState(false);
  const [todayKey, setTodayKey] = useState(0);

  useEffect(() => {
    setLocale(readStoredLang());
    setTheme(readStoredTheme());
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const toggleLang = useCallback(() => {
    const next = otherLocale(locale);
    setLocale(next);
    try {
      localStorage.setItem(STORAGE_LANG, next);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null && root.getAttribute("data-theme") === "dark") ||
      (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_THEME, next);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const openFlow = useCallback((flowId: string) => {
    setActiveFlow(flowId);
  }, []);

  const closeFlow = useCallback(() => {
    setActiveFlow(undefined);
  }, []);

  const onFlowFinished = useCallback(() => {
    setTodayKey((k) => k + 1);
    setTab("today");
  }, []);

  return (
    <div className="shell">
      <div className="device">
        <header className="bar">
          <div className="avatar">RB</div>
          <div className="bar-id">
            <div className="proj">{t(locale, "app.project")}</div>
            <span className="chip">{t(locale, "app.contract")}</span>
          </div>
          <button
            type="button"
            className="langbtn"
            onClick={toggleLang}
            aria-label={t(locale, "lang.toggle")}
          >
            {locale === "en" ? "EN" : "AF"}
          </button>
          <button
            type="button"
            className="iconbtn"
            onClick={toggleTheme}
            aria-label={t(locale, "theme.flip")}
          >
            ◐
          </button>
        </header>

        <div className={`offline ${online ? "on" : "off"}`} role="status">
          {online ? t(locale, "offline.online") : t(locale, "offline.offline")}
        </div>

        <div className="scroll">
          {activeFlow !== undefined ? (
            <FlowRunner
              locale={locale}
              flowId={activeFlow}
              onClose={closeFlow}
              onFinished={onFlowFinished}
            />
          ) : (
            <>
              {TABS.map((id) => (
                <section
                  key={id}
                  className={`pane ${tab === id ? "on" : ""}`}
                  hidden={tab !== id}
                  aria-hidden={tab !== id}
                >
                  {paneContent(id, locale, {
                    onOpenFlow: openFlow,
                    onCriticalChange: setCriticalDot,
                    todayKey,
                  })}
                </section>
              ))}
            </>
          )}
        </div>

        <nav className="tabs" aria-label="Main">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "on" : ""}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              disabled={activeFlow !== undefined}
            >
              <span>{t(locale, TAB_LABEL[id])}</span>
              {id === "today" && criticalDot && <i className="dot" aria-hidden />}
            </button>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}

function paneContent(
  tab: TabId,
  locale: Locale,
  ctx: {
    onOpenFlow: (flowId: string) => void;
    onCriticalChange: (v: boolean) => void;
    todayKey: number;
  },
) {
  if (tab === "today") {
    return (
      <TodayPane
        key={ctx.todayKey}
        locale={locale}
        onOpenFlow={ctx.onOpenFlow}
        onCriticalChange={ctx.onCriticalChange}
      />
    );
  }
  if (tab === "guides") {
    return <GuidesPane locale={locale} onOpenFlow={ctx.onOpenFlow} />;
  }
  if (tab === "money") {
    return (
      <div className="card">
        <h2>{t(locale, "money.heading")}</h2>
        <p>{t(locale, "money.body")}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>{t(locale, "board.heading")}</h2>
      <p>{t(locale, "board.body")}</p>
    </div>
  );
}
