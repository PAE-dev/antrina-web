import { type LocaleCode } from '@antrina/contracts';

export const LOCALES: readonly LocaleCode[] = ['es', 'en'];

export const DEFAULT_LOCALE: LocaleCode = 'es';

export const HTML_LANG: Record<LocaleCode, string> = { es: 'es-PE', en: 'en' };

/** Para hreflang: la versión en español es para hispanohablantes de cualquier país. */
export const HREFLANG: Record<LocaleCode, string> = { es: 'es', en: 'en' };

export const LOCALE_LABEL: Record<LocaleCode, string> = { es: 'ES', en: 'EN' };

/** Construye una ruta respetando que el idioma por defecto no lleva prefijo. */
export function localePath(locale: LocaleCode, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === '/' ? `/${locale}/` : `/${locale}${normalized}`;
}
