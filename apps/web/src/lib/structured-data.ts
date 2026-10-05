import {
  type LocaleCode,
  type MoneyDto,
  type ProductDetailDto,
  type ProductSummaryDto,
} from '@antrina/contracts';
import { HTML_LANG } from '../i18n/config';
import { routes } from './routes';
import { absoluteUrl, BRAND, CONTACT_EMAIL, SITE_URL, WHATSAPP_NUMBER } from './site';

/** Datos estructurados schema.org (JSON-LD) para resultados enriquecidos de Google. */
export type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const organizationRef = { '@type': 'Organization', '@id': ORGANIZATION_ID, name: BRAND.name };

const price = (money: MoneyDto) => (money.amount / 100).toFixed(2);

/** Para `<script type="application/ld+json">`: escapa `<` para que un texto no pueda cerrar la etiqueta. */
export const serializeJsonLd = (data: JsonLd) => JSON.stringify(data).replaceAll('<', '\\u003c');

export function organization(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: BRAND.name,
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    slogan: 'Arraigado en tu intención',
    address: {
      '@type': 'PostalAddress',
      addressLocality: BRAND.city,
      addressCountry: BRAND.country,
    },
    ...(WHATSAPP_NUMBER || CONTACT_EMAIL
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            availableLanguage: ['Spanish', 'English'],
            ...(WHATSAPP_NUMBER ? { telephone: `+${WHATSAPP_NUMBER}` } : {}),
            ...(CONTACT_EMAIL ? { email: CONTACT_EMAIL } : {}),
          },
        }
      : {}),
  };
}

export function website(locale: LocaleCode): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BRAND.name,
    url: SITE_URL,
    inLanguage: HTML_LANG[locale],
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl(routes.search(locale))}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbs(items: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function product(
  detail: ProductDetailDto,
  locale: LocaleCode,
  path: string,
  category: string,
): JsonLd {
  const url = absoluteUrl(path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: detail.name,
    description: detail.metaDescription ?? detail.description,
    sku: detail.sku,
    url,
    ...(detail.images.length > 0 ? { image: detail.images.map((image) => image.url) } : {}),
    category,
    inLanguage: HTML_LANG[locale],
    brand: { '@type': 'Brand', name: BRAND.name },
    manufacturer: organizationRef,
    countryOfOrigin: { '@type': 'Country', name: BRAND.country },
    material: locale === 'es' ? 'Cuarzo y piedras naturales' : 'Quartz and natural stones',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: detail.price.currency,
      price: price(detail.price),
      availability: detail.isPurchasable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: organizationRef,
    },
  };
}

export function itemList(
  name: string,
  products: ProductSummaryDto[],
  productPath: (product: ProductSummaryDto) => string,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(productPath(item)),
      name: item.name,
    })),
  };
}

export function article(input: {
  headline: string;
  description: string;
  path: string;
  locale: LocaleCode;
  image?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    inLanguage: HTML_LANG[input.locale],
    image: input.image ? [input.image] : [absoluteUrl('/og-default.jpg')],
    author: organizationRef,
    publisher: organizationRef,
  };
}

export function faq(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
