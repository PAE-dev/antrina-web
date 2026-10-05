import { type LocaleCode } from '@antrina/contracts';

const env = import.meta.env;

/** Dominio público canónico, sin barra final. Cambiarlo aquí (o en la variable) al conectar el dominio propio. */
export const SITE_URL = (env.PUBLIC_SITE_URL ?? 'http://localhost:4321').replace(/\/+$/, '');

export const BRAND = {
  name: 'Antrina',
  legalName: 'Antrina',
  country: 'PE',
  city: 'Lima',
  /** Código de idioma + país para Open Graph. */
  ogLocale: { es: 'es_PE', en: 'en_US' } satisfies Record<LocaleCode, string>,
} as const;

/** Número internacional sin "+" ni espacios (ej. 51987654321). Vacío = sin botón de WhatsApp. */
export const WHATSAPP_NUMBER = (env.PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export const CONTACT_EMAIL = env.PUBLIC_CONTACT_EMAIL ?? '';

/** Código de verificación de Google Search Console (etiqueta HTML). */
export const GOOGLE_SITE_VERIFICATION = env.PUBLIC_GOOGLE_SITE_VERIFICATION ?? '';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function whatsappUrl(message: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
