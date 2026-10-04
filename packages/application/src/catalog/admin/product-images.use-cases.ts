import {
  type AddProductImageRequest,
  type ImageUploadRequest,
  type ImageUploadTargetDto,
  type ProductImageDto,
} from '@antrina/contracts';
import {
  assertValidImageDimensions,
  assertValidImageUpload,
  type AuditLog,
  DomainError,
  type ImageStorage,
  isImageContentType,
  type ProductImageRepository,
  type ProductRepository,
} from '@antrina/domain';
import { notFound, requireInteger, requireString } from '../../shared/input.js';
import { toProductImageDto } from './admin-catalog.mappers.js';
import { loadProduct } from './admin-products.use-cases.js';
import { parseImageAlt } from './product-draft.input.js';

export const MAX_IMAGES_PER_PRODUCT = 12;

const imageNotFound = () => notFound('Foto', 'catalog.image_not_found');

export interface ProductImagesDeps {
  products: ProductRepository;
  images: ProductImageRepository;
  storage: ImageStorage;
  audit: AuditLog;
}

async function loadImage(deps: ProductImagesDeps, productId: string, imageId: string) {
  const stored = await deps.images.findById(imageId);
  if (!stored || stored.productId !== productId) throw imageNotFound();
  return stored.image;
}

/** Paso 1 de la subida: URL firmada para que el navegador haga PUT directo a MinIO/R2. */
export class RequestImageUploadUseCase {
  constructor(private readonly deps: ProductImagesDeps) {}

  async execute(productId: string, input: ImageUploadRequest): Promise<ImageUploadTargetDto> {
    await loadProduct(this.deps.products, productId);
    const contentType = requireString(input?.contentType, 'contentType', 64);
    const sizeBytes = requireInteger(input?.sizeBytes, 'sizeBytes');
    assertValidImageUpload(contentType, sizeBytes);
    if (!isImageContentType(contentType))
      throw new DomainError('Formato no soportado', 'catalog.image_invalid_type');

    const existing = await this.deps.images.listByProduct(productId);
    if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new DomainError(
        `Máximo ${MAX_IMAGES_PER_PRODUCT} fotos por producto`,
        'catalog.image_limit_reached',
      );
    }

    const target = await this.deps.storage.createUploadTarget({
      productId,
      contentType,
      sizeBytes,
    });
    return { ...target, expiresAt: target.expiresAt.toISOString() };
  }
}

/** Paso 2: tras el PUT, se verifica el objeto en el almacenamiento y se registra en la galería. */
export class AddProductImageUseCase {
  constructor(private readonly deps: ProductImagesDeps) {}

  async execute(
    productId: string,
    input: AddProductImageRequest,
    actorId: string,
  ): Promise<ProductImageDto> {
    await loadProduct(this.deps.products, productId);
    const storageKey = requireString(input?.storageKey, 'storageKey', 300);
    if (!storageKey.startsWith(`products/${productId}/`)) {
      throw new DomainError('La foto no pertenece a este producto', 'catalog.image_invalid_key');
    }
    const width = requireInteger(input.width, 'width');
    const height = requireInteger(input.height, 'height');
    assertValidImageDimensions(width, height);

    const existing = await this.deps.images.listByProduct(productId);
    if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new DomainError(
        `Máximo ${MAX_IMAGES_PER_PRODUCT} fotos por producto`,
        'catalog.image_limit_reached',
      );
    }
    if (existing.some((image) => image.storageKey === storageKey)) {
      throw new DomainError('La foto ya está en la galería', 'catalog.duplicate_image');
    }

    const object = await this.deps.storage.stat(storageKey);
    if (!object)
      throw new DomainError('No se encontró el archivo subido', 'catalog.image_not_uploaded');
    assertValidImageUpload(object.contentType, object.sizeBytes);
    if (!isImageContentType(object.contentType)) {
      throw new DomainError('Formato no soportado', 'catalog.image_invalid_type');
    }

    const image = await this.deps.images.add(productId, {
      storageKey,
      width,
      height,
      contentType: object.contentType,
      sizeBytes: object.sizeBytes,
      alt: parseImageAlt(input.alt),
    });
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'product.image_added',
      entityType: 'Product',
      entityId: productId,
      changes: { imageId: image.id, storageKey },
    });
    return toProductImageDto(image, this.deps.storage);
  }
}

/** El primer id pasa a ser la portada. */
export class ReorderProductImagesUseCase {
  constructor(private readonly deps: ProductImagesDeps) {}

  async execute(productId: string, imageIds: unknown, actorId: string): Promise<ProductImageDto[]> {
    await loadProduct(this.deps.products, productId);
    if (!Array.isArray(imageIds) || imageIds.some((id) => typeof id !== 'string')) {
      throw new DomainError('Orden de fotos inválido', 'input.invalid');
    }
    const ids = imageIds as string[];
    const current = await this.deps.images.listByProduct(productId);
    const currentIds = new Set(current.map((image) => image.id));
    if (
      ids.length !== current.length ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => currentIds.has(id))
    ) {
      throw new DomainError(
        'El orden debe incluir todas las fotos del producto',
        'catalog.image_invalid_order',
      );
    }

    const images = await this.deps.images.reorder(productId, ids);
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'product.images_reordered',
      entityType: 'Product',
      entityId: productId,
      changes: { order: ids },
    });
    return images.map((image) => toProductImageDto(image, this.deps.storage));
  }
}

export class UpdateProductImageAltUseCase {
  constructor(private readonly deps: ProductImagesDeps) {}

  async execute(
    productId: string,
    imageId: string,
    alt: unknown,
    actorId: string,
  ): Promise<ProductImageDto> {
    const before = await loadImage(this.deps, productId, imageId);
    const image = await this.deps.images.updateAlt(imageId, parseImageAlt(alt));
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'product.image_alt_updated',
      entityType: 'Product',
      entityId: productId,
      changes: { imageId, alt: { from: before.alt, to: image.alt } },
    });
    return toProductImageDto(image, this.deps.storage);
  }
}

export class DeleteProductImageUseCase {
  constructor(private readonly deps: ProductImagesDeps) {}

  async execute(productId: string, imageId: string, actorId: string): Promise<void> {
    const image = await loadImage(this.deps, productId, imageId);
    await this.deps.images.delete(imageId);
    await this.deps.storage.delete(image.storageKey);
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'product.image_deleted',
      entityType: 'Product',
      entityId: productId,
      changes: { imageId, storageKey: image.storageKey },
    });
  }
}
