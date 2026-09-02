import en from "../messages/en.json";
import af from "../messages/af.json";

export type Locale = "en" | "af";

const catalogues: Record<Locale, Record<string, string>> = { en, af };

export function t(locale: Locale, key: string, vars?: Record<string, string>): string {
  let text = catalogues[locale][key] ?? catalogues.en[key] ?? key;
  if (vars !== undefined) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "af" : "en";
}
