import {
  type AdminSiteImageDto,
  type ImageUploadRequest,
  type ImageUploadTargetDto,
  type SetSiteImageRequest,
  type SiteImagesResponse,
} from '@antrina/contracts';
import {
  assertValidImageDimensions,
  assertValidImageUpload,
  type AuditLog,
  DomainError,
  type ImageStorage,
  type ImageUrlResolver,
  isImageContentType,
  isSiteImageSlot,
  type Locale,
  type SiteImage,
  type SiteImageRepository,
  type SiteImageSlot,
} from '@antrina/domain';
import { parseImageAlt } from '../catalog/admin/product-draft.input.js';
import { notFound, requireInteger, requireString } from '../shared/input.js';

export interface SiteImagesDeps {
  images: SiteImageRepository;
  storage: ImageStorage;
  audit: AuditLog;
}

function requireSlot(value: unknown): SiteImageSlot {
  if (!isSiteImageSlot(value)) throw notFound('Hueco de foto', 'site.slot_not_found');
  return value;
}

function toAdminSiteImageDto(image: SiteImage, urls: ImageUrlResolver): AdminSiteImageDto {
  return {
    slot: image.slot,
    url: urls.publicUrl(image.storageKey),
    width: image.width,
    height: image.height,
    alt: { ...image.alt },
    updatedAt: image.updatedAt.toISOString(),
  };
}

/** Fotos editoriales para la tienda, con el texto alternativo del idioma pedido. */
export class ListSiteImagesUseCase {
  constructor(
    private readonly images: SiteImageRepository,
    private readonly urls: ImageUrlResolver,
  ) {}

  async execute(locale: Locale): Promise<SiteImagesResponse> {
    const images = await this.images.findAll();
    return Object.fromEntries(
      images.map((image) => [
        image.slot,
        {
          url: this.urls.publicUrl(image.storageKey),
          alt: image.alt[locale] ?? image.alt.es ?? '',
          width: image.width,
          height: image.height,
        },
      ]),
    );
  }
}

export class ListAdminSiteImagesUseCase {
  constructor(
    private readonly images: SiteImageRepository,
    private readonly urls: ImageUrlResolver,
  ) {}

  async execute(): Promise<AdminSiteImageDto[]> {
    const images = await this.images.findAll();
    return images.map((image) => toAdminSiteImageDto(image, this.urls));
  }
}

/** Paso 1: URL firmada para subir la foto directo al bucket. */
export class RequestSiteImageUploadUseCase {
  constructor(private readonly deps: SiteImagesDeps) {}

  async execute(slot: unknown, input: ImageUploadRequest): Promise<ImageUploadTargetDto> {
    const validSlot = requireSlot(slot);
    const contentType = assertValidImageUpload(
      requireString(input?.contentType, 'contentType', 64),
      requireInteger(input?.sizeBytes, 'sizeBytes'),
    );
    const target = await this.deps.storage.createUploadTarget({
      prefix: `site/${validSlot}`,
      contentType,
      sizeBytes: input.sizeBytes,
    });
    return { ...target, expiresAt: target.expiresAt.toISOString() };
  }
}

/** Paso 2: verifica el archivo subido y reemplaza la foto del hueco (borra la anterior del bucket). */
export class SetSiteImageUseCase {
  constructor(private readonly deps: SiteImagesDeps) {}

  async execute(
    slot: unknown,
    input: SetSiteImageRequest,
    actorId: string,
  ): Promise<AdminSiteImageDto> {
    const validSlot = requireSlot(slot);
    const storageKey = requireString(input?.storageKey, 'storageKey', 300);
    if (!storageKey.startsWith(`site/${validSlot}/`)) {
      throw new DomainError('La foto no pertenece a este hueco', 'site.image_invalid_key');
    }
    const width = requireInteger(input.width, 'width');
    const height = requireInteger(input.height, 'height');
    assertValidImageDimensions(width, height);

    const object = await this.deps.storage.stat(storageKey);
    if (!object) {
      throw new DomainError('No se encontró el archivo subido', 'site.image_not_uploaded');
    }
    assertValidImageUpload(object.contentType, object.sizeBytes);
    if (!isImageContentType(object.contentType)) {
      throw new DomainError('Formato no soportado', 'site.image_invalid_type');
    }

    const previous = await this.deps.images.findBySlot(validSlot);
    const image = await this.deps.images.replace({
      slot: validSlot,
      storageKey,
      width,
      height,
      contentType: object.contentType,
      sizeBytes: object.sizeBytes,
      alt: parseImageAlt(input.alt),
    });
    if (previous && previous.storageKey !== storageKey) {
      await this.deps.storage.delete(previous.storageKey);
    }
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'site.image_set',
      entityType: 'SiteImage',
      entityId: validSlot,
      changes: { storageKey: { from: previous?.storageKey ?? null, to: storageKey } },
    });
    return toAdminSiteImageDto(image, this.deps.storage);
  }
}

export class UpdateSiteImageAltUseCase {
  constructor(private readonly deps: SiteImagesDeps) {}

  async execute(slot: unknown, alt: unknown, actorId: string): Promise<AdminSiteImageDto> {
    const validSlot = requireSlot(slot);
    const before = await this.deps.images.findBySlot(validSlot);
    if (!before) throw notFound('Foto', 'site.image_not_found');
    const image = await this.deps.images.updateAlt(validSlot, parseImageAlt(alt));
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'site.image_alt_updated',
      entityType: 'SiteImage',
      entityId: validSlot,
      changes: { alt: { from: before.alt, to: image.alt } },
    });
    return toAdminSiteImageDto(image, this.deps.storage);
  }
}

export class DeleteSiteImageUseCase {
  constructor(private readonly deps: SiteImagesDeps) {}

  async execute(slot: unknown, actorId: string): Promise<void> {
    const validSlot = requireSlot(slot);
    const image = await this.deps.images.findBySlot(validSlot);
    if (!image) throw notFound('Foto', 'site.image_not_found');
    await this.deps.images.delete(validSlot);
    await this.deps.storage.delete(image.storageKey);
    await this.deps.audit.record({
      adminUserId: actorId,
      action: 'site.image_deleted',
      entityType: 'SiteImage',
      entityId: validSlot,
      changes: { storageKey: image.storageKey },
    });
  }
}
