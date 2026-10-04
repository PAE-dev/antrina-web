export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE = 'es' satisfies Locale;

export type DefaultLocale = typeof DEFAULT_LOCALE;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Contenido traducible indexado por locale. Siempre debe existir el DEFAULT_LOCALE.
 */
export type Localized<T> = Readonly<Record<DefaultLocale, T> & Partial<Record<Locale, T>>>;

export function pickLocalized<T>(values: Localized<T>, locale: Locale): T {
  return values[locale] ?? values[DEFAULT_LOCALE];
}
