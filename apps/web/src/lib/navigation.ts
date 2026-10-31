import { type CategoryDto, type LocaleCode } from '@antrina/contracts';
import {
  type FooterColumn,
  type LocaleOption,
  type NavCategory,
  type SocialLink,
} from '@antrina/ui';
import { LOCALE_LABEL, LOCALES, localePath } from '../i18n/config';
import { type Dictionary } from '../i18n/dictionaries';
import { INTENTIONS, SIGNS, SIZES } from '../i18n/taxonomy';
import { visibleRootCategories } from './page-data';
import { type Alternates, categoryPath, routes, TREES_CATEGORY_SLUG } from './routes';
import { WHATSAPP_NUMBER } from './site';

/** El menú "Categorías" solo tiene sentido cuando hay algo más que árboles. */
function shopCategories(categories: CategoryDto[]): CategoryDto[] {
  const visible = visibleRootCategories(categories);
  return visible.some((category) => category.slug !== TREES_CATEGORY_SLUG) ? visible : [];
}

export function buildMainNavigation(
  locale: LocaleCode,
  t: Dictionary,
  categories: CategoryDto[] = [],
): NavCategory[] {
  const shop = shopCategories(categories);
  return [
    ...(shop.length > 0
      ? [
          {
            label: t.nav.categories,
            href: routes.category(locale),
            items: shop.map((category) => ({
              label: category.name,
              href: categoryPath(locale, category),
            })),
          },
        ]
      : []),
    {
      label: t.nav.intention,
      href: routes.intention(locale),
      items: INTENTIONS.map(({ slug, copy }) => ({
        label: copy[locale].label,
        href: routes.intention(locale, slug[locale]),
        detail: copy[locale].stones,
      })),
    },
    {
      label: t.nav.sign,
      href: routes.sign(locale),
      items: SIGNS.map(({ slug, copy }) => ({
        label: copy[locale].label,
        href: routes.sign(locale, slug[locale]),
        detail: copy[locale].stone,
      })),
    },
    {
      label: t.nav.size,
      href: routes.size(locale),
      items: SIZES.map(({ slug, copy }) => ({
        label: copy[locale].label,
        href: routes.size(locale, slug[locale]),
      })),
    },
    { label: t.nav.createTree, href: routes.createTree(locale), items: [], isHighlighted: true },
    { label: t.nav.meanings, href: routes.meanings(locale), items: [] },
    { label: t.nav.corporate, href: routes.corporate(locale), items: [] },
    // Con "Categorías" el menú ya es largo: la historia sigue a mano en el pie.
    ...(shop.length > 0 ? [] : [{ label: t.nav.story, href: routes.story(locale), items: [] }]),
  ];
}

export function buildFooterColumns(
  locale: LocaleCode,
  t: Dictionary,
  categories: CategoryDto[] = [],
): FooterColumn[] {
  return [
    {
      title: t.footer.shop,
      links: [
        ...(shopCategories(categories).length > 0
          ? [{ label: t.nav.categories, href: routes.category(locale) }]
          : []),
        { label: t.nav.intention, href: routes.intention(locale) },
        { label: t.nav.sign, href: routes.sign(locale) },
        { label: t.nav.size, href: routes.size(locale) },
        { label: t.nav.createTree, href: routes.createTree(locale) },
      ],
    },
    {
      title: t.footer.brand,
      links: [
        { label: t.nav.story, href: routes.story(locale) },
        { label: t.nav.meanings, href: routes.meanings(locale) },
        { label: t.nav.corporate, href: routes.corporate(locale) },
      ],
    },
    {
      title: t.footer.help,
      links: [
        { label: t.footer.shipping, href: routes.shipping(locale) },
        { label: t.footer.contact, href: routes.contact(locale) },
        { label: t.header.account, href: routes.account(locale) },
      ],
    },
  ];
}

/** Opciones de idioma apuntando a la misma página en cada locale. */
export function buildLocaleOptions(
  current: LocaleCode,
  pathFor: (locale: LocaleCode) => string,
): LocaleOption[] {
  return LOCALES.map((code) => ({
    code,
    label: LOCALE_LABEL[code],
    href: pathFor(code),
    isActive: code === current,
  }));
}

/** Si una página no existe en otro idioma, ese idioma lleva a su portada. */
export const localeOptionsFor = (current: LocaleCode, alternates: Alternates) =>
  buildLocaleOptions(current, (code) => alternates[code] ?? localePath(code, '/'));

/** Pendiente: reemplazar por las cuentas oficiales de Antrina. */
export const SOCIAL_LINKS: SocialLink[] = [
  { network: 'instagram', label: 'Instagram', href: 'https://instagram.com' },
  { network: 'facebook', label: 'Facebook', href: 'https://facebook.com' },
  ...(WHATSAPP_NUMBER
    ? [
        {
          network: 'whatsapp' as const,
          label: 'WhatsApp',
          href: `https://wa.me/${WHATSAPP_NUMBER}`,
        },
      ]
    : []),
];
