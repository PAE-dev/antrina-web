import {
  type ProductBadgeCode,
  type ProductIntentionCode,
  type ProductSizeCode,
  type ZodiacSignCode,
} from './catalog.js';
import { type CurrencyCode, type LocaleCode, type MoneyDto } from './common.js';

export type ProductStatusCode = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ImageContentTypeCode = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ProductContentDto {
  name: string;
  slug: string;
  description: string;
  /** Título para Google; null = se usa el nombre. */
  metaTitle: string | null;
  /** Descripción para Google; null = se usa la descripción. */
  metaDescription: string | null;
}

/** El español es obligatorio; el inglés es opcional mientras no se traduzca. */
export interface ProductContentByLocaleDto {
  es: ProductContentDto;
  en: ProductContentDto | null;
}

export type ImageAltDto = Partial<Record<LocaleCode, string>>;

export interface ProductImageDto {
  id: string;
  url: string;
  position: number;
  width: number;
  height: number;
  alt: ImageAltDto;
}

export interface AdminProductListItemDto {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  status: ProductStatusCode;
  /** Precio de venta actual: el de oferta si hay oferta. */
  price: MoneyDto;
  /** Precio normal cuando hay oferta. */
  compareAtPrice: MoneyDto | null;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  coverUrl: string | null;
  imageCount: number;
  updatedAt: string;
}

export interface AdminProductDto {
  id: string;
  sku: string;
  categoryId: string;
  categorySlug: string;
  /** Precio de venta actual: el de oferta si hay oferta. */
  price: MoneyDto;
  /** Precio normal cuando hay oferta. */
  compareAtPrice: MoneyDto | null;
  /** Costo interno; nunca sale a la tienda. */
  cost: MoneyDto | null;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  size: ProductSizeCode | null;
  intention: ProductIntentionCode | null;
  signs: ZodiacSignCode[];
  stones: string[];
  origin: string | null;
  content: ProductContentByLocaleDto;
  images: ProductImageDto[];
  updatedAt: string;
}

export type AdminStockFilterCode = 'low' | 'out';

export interface AdminProductListQuery {
  q?: string;
  status?: ProductStatusCode;
  /** Incluye las subcategorías. */
  categoryId?: string;
  /** `low`: stock bajo con existencias. `out`: agotado. */
  stock?: AdminStockFilterCode;
  page?: number;
  pageSize?: number;
}

export interface AdminProductListResponse {
  data: AdminProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpsertProductRequest {
  sku: string;
  categoryId: string;
  /** Céntimos. Precio de venta actual: el de oferta si hay oferta. */
  priceCents: number;
  /** Céntimos. Precio normal cuando hay oferta; debe ser mayor que `priceCents`. */
  compareAtPriceCents: number | null;
  /** Céntimos. Costo interno para calcular el margen. */
  costCents: number | null;
  currency: CurrencyCode;
  /** Solo se usa al crear: después el stock cambia con movimientos de inventario. */
  stock: number;
  lowStockThreshold: number;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  size: ProductSizeCode | null;
  intention: ProductIntentionCode | null;
  signs: ZodiacSignCode[];
  stones?: string[];
  origin: string | null;
  content: ProductContentByLocaleDto;
}

export interface ImageUploadRequest {
  contentType: ImageContentTypeCode;
  sizeBytes: number;
}

export interface ImageUploadTargetDto {
  storageKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface AddProductImageRequest {
  storageKey: string;
  width: number;
  height: number;
  alt: ImageAltDto;
}

export interface ReorderProductImagesRequest {
  imageIds: string[];
}

export interface UpdateProductImageAltRequest {
  alt: ImageAltDto;
}

export interface CategoryContentDto {
  name: string;
  slug: string;
  description: string | null;
}

export interface AdminCategoryDto {
  id: string;
  slug: string;
  /** Nombre en español. */
  name: string;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  childCount: number;
  content: { es: CategoryContentDto; en: CategoryContentDto | null };
}

export interface UpsertCategoryRequest {
  /** Categoría superior; null = categoría principal. Solo se admite un nivel de subcategoría. */
  parentId: string | null;
  sortOrder: number;
  content: { es: CategoryContentDto; en: CategoryContentDto | null };
}

export type StockMovementTypeCode =
  'INITIAL' | 'RESTOCK' | 'SALE' | 'SALE_CANCELLED' | 'ADJUSTMENT';

export interface StockMovementDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: StockMovementTypeCode;
  /** Positivo si entra, negativo si sale. */
  quantity: number;
  stockAfter: number;
  note: string | null;
  orderId: string | null;
  orderNumber: number | null;
  adminName: string | null;
  createdAt: string;
}

export interface StockMovementListQuery {
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface StockMovementListResponse {
  data: StockMovementDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdjustStockRequest {
  /** `RESTOCK`: entrada de unidades. `ADJUSTMENT`: corrección, positiva o negativa. */
  type: 'RESTOCK' | 'ADJUSTMENT';
  quantity: number;
  note: string | null;
}

export interface InventoryItemDto {
  id: string;
  sku: string;
  name: string;
  status: ProductStatusCode;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

/** Categoría con sus productos; las principales llevan sus subcategorías en `children`. */
export interface InventoryGroupDto {
  categoryId: string;
  name: string;
  /** Unidades de la categoría, subcategorías incluidas. */
  units: number;
  items: InventoryItemDto[];
  children: InventoryGroupDto[];
}

export interface InventoryQuery {
  q?: string;
  stock?: AdminStockFilterCode;
}

export interface InventoryResponse {
  groups: InventoryGroupDto[];
}

export interface ClearStockRequest {
  productIds: string[];
  note: string | null;
}

export interface ClearStockResponse {
  /** Productos que tenían stock y quedaron en cero. */
  cleared: number;
  /** Unidades retiradas en total. */
  units: number;
}

export interface ProductPieceDto {
  id: string;
  productId: string;
  serial: number;
  code: string;
  voidedAt: string | null;
  /** Cuando alguien reclamó su torito con este código. */
  claimedAt: string | null;
  createdAt: string;
}

export interface ProductPieceListResponse {
  data: ProductPieceDto[];
  /** Si el QR abre la experiencia del torito; si no, solo confirma que la pieza es auténtica. */
  opensTorito: boolean;
}

export interface GenerateProductPiecesRequest {
  quantity: number;
}

/** Ruta pública que abre el QR de una pieza. Va impresa en la etiqueta: no puede cambiar. */
export const pieceQrPath = (code: string) => `/q/${code}`;

export const ADMIN_CATALOG_ROUTES = {
  products: '/admin/products',
  product: (id: string) => `/admin/products/${id}`,
  archiveProduct: (id: string) => `/admin/products/${id}/archive`,
  imageUploadUrl: (id: string) => `/admin/products/${id}/images/upload-url`,
  images: (id: string) => `/admin/products/${id}/images`,
  imagesOrder: (id: string) => `/admin/products/${id}/images/order`,
  image: (id: string, imageId: string) => `/admin/products/${id}/images/${imageId}`,
  categories: '/admin/categories',
  category: (id: string) => `/admin/categories/${id}`,
  productStock: (id: string) => `/admin/products/${id}/stock`,
  stockMovements: '/admin/stock-movements',
  inventory: '/admin/inventory',
  inventoryClear: '/admin/inventory/clear',
  productPieces: (id: string) => `/admin/products/${id}/pieces`,
  voidProductPiece: (id: string, pieceId: string) => `/admin/products/${id}/pieces/${pieceId}/void`,
} as const;
