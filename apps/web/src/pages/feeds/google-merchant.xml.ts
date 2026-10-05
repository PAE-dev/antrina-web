import { type APIRoute } from 'astro';
import { intentionLabel } from '../../i18n/taxonomy';
import { CATALOG_CACHE_CONTROL, getProductIndex } from '../../lib/catalog';
import { routes } from '../../lib/routes';
import { absoluteUrl, BRAND } from '../../lib/site';

export const prerender = false;

/** Taxonomía de Google: "Hogar y jardín > Decoración" (id 696). */
const GOOGLE_PRODUCT_CATEGORY = '696';
const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;
const ADDITIONAL_IMAGES_MAX = 10;

const xml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const tag = (name: string, value: string) => `<g:${name}>${xml(value)}</g:${name}>`;
const plain = (name: string, value: string) => `<${name}>${xml(value)}</${name}>`;

/**
 * Feed de productos para Google Merchant Center (RSS 2.0, español, Perú). Solo productos con foto:
 * Google rechaza los artículos sin imagen. El envío se configura en Merchant Center.
 */
export const GET: APIRoute = async () => {
  const products = await getProductIndex();
  if (!products) {
    return new Response('Catálogo no disponible', {
      status: 503,
      headers: { 'Retry-After': '120' },
    });
  }

  const items = products
    .filter((product) => product.imageUrls.length > 0)
    .map((product) => {
      const content = product.content.es;
      const [image, ...extraImages] = product.imageUrls;
      const intention = intentionLabel('es', product.categorySlug);
      return [
        '<item>',
        tag('id', product.sku),
        plain('title', content.name.slice(0, TITLE_MAX)),
        plain('description', content.description.slice(0, DESCRIPTION_MAX)),
        plain('link', absoluteUrl(routes.product('es', content.slug))),
        tag('image_link', image ?? ''),
        ...extraImages
          .slice(0, ADDITIONAL_IMAGES_MAX)
          .map((url) => tag('additional_image_link', url)),
        tag('availability', product.isPurchasable ? 'in_stock' : 'out_of_stock'),
        tag('price', `${(product.price.amount / 100).toFixed(2)} ${product.price.currency}`),
        tag('brand', BRAND.name),
        tag('condition', 'new'),
        tag('identifier_exists', 'no'),
        tag('google_product_category', GOOGLE_PRODUCT_CATEGORY),
        tag('product_type', intention ? `Árboles de cuarzo > ${intention}` : 'Árboles de cuarzo'),
        tag('material', 'Cuarzo y piedras naturales'),
        '</item>',
      ].join('');
    });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    `<title>${xml(BRAND.name)}</title>`,
    `<link>${xml(absoluteUrl('/'))}</link>`,
    '<description>Árboles de cuarzo hechos a mano en Lima</description>',
    ...items,
    '</channel>',
    '</rss>',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': CATALOG_CACHE_CONTROL,
    },
  });
};
