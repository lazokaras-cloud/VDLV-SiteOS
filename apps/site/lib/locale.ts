import en from "../messages/en.json";
import af from "../messages/af.json";

export type Locale = "en" | "af";

const catalogues: Record<Locale, Record<string, string>> = { en, af };

export function t(locale: Locale, key: string): string {
  return catalogues[locale][key] ?? catalogues.en[key] ?? key;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "af" : "en";
}
