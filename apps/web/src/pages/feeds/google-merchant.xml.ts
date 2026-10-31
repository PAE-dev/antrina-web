import { type APIRoute } from 'astro';
import { intentionLabel } from '../../i18n/taxonomy';
import { CATALOG_CACHE_CONTROL, getProductIndex } from '../../lib/catalog';
import { productPath, TREES_CATEGORY_SLUG } from '../../lib/routes';
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
      const intention = product.intention ? intentionLabel('es', product.intention) : '';
      const isTree = product.categorySlug === TREES_CATEGORY_SLUG;
      const money = ({ amount, currency }: typeof product.price) =>
        `${(amount / 100).toFixed(2)} ${currency}`;
      return [
        '<item>',
        tag('id', product.sku),
        plain('title', content.name.slice(0, TITLE_MAX)),
        plain('description', content.description.slice(0, DESCRIPTION_MAX)),
        plain('link', absoluteUrl(productPath('es', content.slug, product.categorySlug))),
        tag('image_link', image ?? ''),
        ...extraImages
          .slice(0, ADDITIONAL_IMAGES_MAX)
          .map((url) => tag('additional_image_link', url)),
        tag('availability', product.isPurchasable ? 'in_stock' : 'out_of_stock'),
        // Con oferta, Google pide el precio normal en `price` y la oferta en `sale_price`.
        tag('price', money(product.compareAtPrice ?? product.price)),
        ...(product.compareAtPrice ? [tag('sale_price', money(product.price))] : []),
        tag('brand', BRAND.name),
        tag('condition', 'new'),
        tag('identifier_exists', 'no'),
        tag('google_product_category', GOOGLE_PRODUCT_CATEGORY),
        tag(
          'product_type',
          intention ? `${product.categoryName} > ${intention}` : product.categoryName,
        ),
        ...(isTree ? [tag('material', 'Cuarzo y piedras naturales')] : []),
        '</item>',
      ].join('');
    });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    `<title>${xml(BRAND.name)}</title>`,
    `<link>${xml(absoluteUrl('/'))}</link>`,
    '<description>Árboles de cuarzo y piezas hechas a mano en Lima</description>',
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
