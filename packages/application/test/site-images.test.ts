import {
  type ImageAlt,
  type ImageStorage,
  type NewSiteImage,
  type SiteImage,
  type SiteImageRepository,
  type SiteImageSlot,
} from '@antrina/domain';
import { describe, expect, it } from 'vitest';
import {
  DeleteSiteImageUseCase,
  ListSiteImagesUseCase,
  RequestSiteImageUploadUseCase,
  SetSiteImageUseCase,
  type SiteImagesDeps,
} from '../src/index.js';
import { MemoryAudit } from './fakes.js';

class InMemorySiteImages implements SiteImageRepository {
  readonly images = new Map<SiteImageSlot, SiteImage>();
  async findAll() {
    return [...this.images.values()];
  }
  async findBySlot(slot: SiteImageSlot) {
    return this.images.get(slot) ?? null;
  }
  async replace(image: NewSiteImage) {
    const stored = { ...image, updatedAt: new Date('2026-10-04T12:00:00Z') };
    this.images.set(image.slot, stored);
    return stored;
  }
  async updateAlt(slot: SiteImageSlot, alt: ImageAlt) {
    const image = { ...this.images.get(slot)!, alt };
    this.images.set(slot, image);
    return image;
  }
  async delete(slot: SiteImageSlot) {
    this.images.delete(slot);
  }
}

function fakeStorage() {
  const objects = new Map<string, { sizeBytes: number; contentType: string }>();
  const deleted: string[] = [];
  const storage: ImageStorage = {
    publicUrl: (key) => `https://media.test/${key}`,
    createUploadTarget: async ({ prefix, contentType }) => ({
      storageKey: `${prefix}/nuevo.webp`,
      uploadUrl: 'https://upload.test',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date('2026-10-04T12:05:00Z'),
    }),
    stat: async (key) => objects.get(key) ?? null,
    delete: async (key) => {
      deleted.push(key);
      objects.delete(key);
    },
  };
  return { storage, objects, deleted };
}

function setup() {
  const images = new InMemorySiteImages();
  const { storage, objects, deleted } = fakeStorage();
  const audit = new MemoryAudit();
  const deps: SiteImagesDeps = { images, storage, audit };
  return { deps, images, objects, deleted, audit };
}

describe('fotos de portada', () => {
  it('sube a la carpeta del hueco y rechaza huecos desconocidos', async () => {
    const { deps } = setup();
    const upload = new RequestSiteImageUploadUseCase(deps);
    const target = await upload.execute('hero', { contentType: 'image/webp', sizeBytes: 1000 });
    expect(target.storageKey).toBe('site/hero/nuevo.webp');
    await expect(
      upload.execute('banner', { contentType: 'image/webp', sizeBytes: 1000 }),
    ).rejects.toMatchObject({ code: 'site.slot_not_found' });
  });

  it('reemplaza la foto, borra la anterior del bucket y audita', async () => {
    const { deps, objects, deleted, audit } = setup();
    const set = new SetSiteImageUseCase(deps);
    objects.set('site/hero/a.webp', { sizeBytes: 1000, contentType: 'image/webp' });
    objects.set('site/hero/b.webp', { sizeBytes: 1000, contentType: 'image/webp' });

    await set.execute(
      'hero',
      { storageKey: 'site/hero/a.webp', width: 1600, height: 2000, alt: { es: ' Árbol ' } },
      'admin-1',
    );
    const second = await set.execute(
      'hero',
      { storageKey: 'site/hero/b.webp', width: 1600, height: 2000, alt: {} },
      'admin-1',
    );

    expect(second.url).toBe('https://media.test/site/hero/b.webp');
    expect(deleted).toEqual(['site/hero/a.webp']);
    expect(audit.entries.map((entry) => entry.action)).toEqual([
      'site.image_set',
      'site.image_set',
    ]);
  });

  it('no acepta claves de otro hueco ni archivos sin subir', async () => {
    const { deps } = setup();
    const set = new SetSiteImageUseCase(deps);
    await expect(
      set.execute('hero', { storageKey: 'site/story/a.webp', width: 1, height: 1, alt: {} }, 'a'),
    ).rejects.toMatchObject({ code: 'site.image_invalid_key' });
    await expect(
      set.execute('hero', { storageKey: 'site/hero/x.webp', width: 1, height: 1, alt: {} }, 'a'),
    ).rejects.toMatchObject({ code: 'site.image_not_uploaded' });
  });

  it('la tienda recibe la URL pública y el texto alternativo del idioma', async () => {
    const { deps, images } = setup();
    await images.replace({
      slot: 'story',
      storageKey: 'site/story/a.webp',
      width: 1200,
      height: 1500,
      contentType: 'image/webp',
      sizeBytes: 1000,
      alt: { es: 'Manos armando un árbol' },
    });
    const list = new ListSiteImagesUseCase(images, deps.storage);
    expect(await list.execute('en')).toEqual({
      story: {
        url: 'https://media.test/site/story/a.webp',
        alt: 'Manos armando un árbol',
        width: 1200,
        height: 1500,
      },
    });

    await new DeleteSiteImageUseCase(deps).execute('story', 'admin-1');
    expect(await list.execute('es')).toEqual({});
  });
});
