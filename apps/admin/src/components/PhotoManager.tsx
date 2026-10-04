import { Button, Input, Label, Spinner, TextField } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminProductDto,
  type ImageAltDto,
  type ImageUploadTargetDto,
  type ProductImageDto,
} from '@antrina/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type DragEvent, useRef, useState } from 'react';
import { api } from '../lib/api';
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../lib/image';
import { ErrorNotice } from './ErrorNotice';

const MAX_IMAGES = 12;

interface UploadItem {
  id: string;
  name: string;
  state: 'processing' | 'uploading' | 'error';
  error?: string;
}

/** Sube un archivo: redimensiona → URL firmada → PUT directo a MinIO/R2 → registra en la API. */
async function uploadOne(productId: string, file: File): Promise<ProductImageDto> {
  const prepared = await prepareImage(file);
  const target = await api<ImageUploadTargetDto>(
    'POST',
    ADMIN_CATALOG_ROUTES.imageUploadUrl(productId),
    {
      contentType: 'image/webp',
      sizeBytes: prepared.blob.size,
    },
  );
  const upload = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: target.headers,
    body: prepared.blob,
  }).catch(() => null);
  if (!upload?.ok) throw new Error(`${file.name}: el almacenamiento rechazó la subida.`);
  return api<ProductImageDto>('POST', ADMIN_CATALOG_ROUTES.images(productId), {
    storageKey: target.storageKey,
    width: prepared.width,
    height: prepared.height,
    alt: {},
  });
}

export function PhotoManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageDto[];
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const productKey = ['admin', 'product', productId];
  const setImages = (next: ProductImageDto[]) => {
    queryClient.setQueryData<AdminProductDto>(productKey, (current) =>
      current ? { ...current, images: next } : current,
    );
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: productKey });

  const reorder = useMutation({
    mutationFn: (imageIds: string[]) =>
      api<ProductImageDto[]>('PUT', ADMIN_CATALOG_ROUTES.imagesOrder(productId), { imageIds }),
    onMutate: (imageIds) => {
      const byId = new Map(images.map((image) => [image.id, image]));
      setImages(
        imageIds.flatMap((id, position) => {
          const image = byId.get(id);
          return image ? [{ ...image, position }] : [];
        }),
      );
    },
    onSuccess: setImages,
    onError: () => void refresh(),
  });

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));
    const room = MAX_IMAGES - images.length;
    const accepted = list.slice(0, Math.max(0, room));
    if (accepted.length === 0) return;
    const items: UploadItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      state: 'processing',
    }));
    setUploads((current) => [...current, ...items]);

    for (const [index, file] of accepted.entries()) {
      const item = items[index];
      if (!item) continue;
      const update = (patch: Partial<UploadItem>) =>
        setUploads((current) => current.map((u) => (u.id === item.id ? { ...u, ...patch } : u)));
      try {
        update({ state: 'uploading' });
        await uploadOne(productId, file);
        setUploads((current) => current.filter((u) => u.id !== item.id));
        await refresh();
      } catch (error) {
        update({
          state: 'error',
          error: error instanceof Error ? error.message : 'Error al subir',
        });
      }
    }
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const ids = images.map((image) => image.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    reorder.mutate(ids);
  };

  const onDropZone = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(false);
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  };

  const onDropCard = (event: DragEvent<HTMLLIElement>, targetIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedId) return;
    const from = images.findIndex((image) => image.id === draggedId);
    setDraggedId(null);
    if (from >= 0) move(from, targetIndex);
  };

  const isFull = images.length >= MAX_IMAGES;

  return (
    <section
      className="flex flex-col gap-8 border-t border-border pt-10"
      aria-labelledby="photos-title"
    >
      <div className="flex flex-col gap-3">
        <h2 id="photos-title" className="type-h3">
          Fotos{' '}
          <span className="text-text-muted">
            ({images.length}/{MAX_IMAGES})
          </span>
        </h2>
        <p className="type-body text-[15px]">
          La primera foto es la portada en la tienda. Arrastra para reordenar. Luz natural, fondos
          arena o ambientes reales; nunca recortes sobre blanco puro.
        </p>
      </div>

      {!isFull && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!draggedId) setIsDropTarget(true);
          }}
          onDragLeave={() => setIsDropTarget(false)}
          onDrop={onDropZone}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center transition-colors ${
            isDropTarget
              ? 'border-brand bg-brand-tint'
              : 'border-border-strong bg-surface hover:border-brand'
          }`}
        >
          <span className="type-menu text-text">Arrastra fotos aquí o haz clic para elegirlas</span>
          <span className="text-[13px] text-text-muted">
            JPG, PNG o WebP. Se optimizan automáticamente (WebP, máx. 2400 px).
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            hidden
            data-testid="photo-input"
            onChange={(event) => {
              if (event.target.files) void handleFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.id} className="flex items-center gap-3 text-[14px] text-text-secondary">
              {upload.state === 'error' ? (
                <span className="text-brand">{upload.error}</span>
              ) : (
                <>
                  <Spinner size="sm" aria-label="Subiendo" />
                  <span>
                    {upload.state === 'processing' ? 'Optimizando' : 'Subiendo'} {upload.name}…
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ErrorNotice error={reorder.error} title="No se pudo reordenar" />

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={(event) => {
                setDraggedId(image.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropCard(event, index)}
              className={`flex flex-col gap-3 ${draggedId === image.id ? 'opacity-50' : ''}`}
            >
              <div className="relative aspect-[4/5] cursor-grab overflow-hidden rounded-sm bg-bg-alt">
                <img
                  src={image.url}
                  alt={image.alt.es ?? ''}
                  loading="lazy"
                  className="size-full object-cover"
                  draggable={false}
                />
                {index === 0 && <span className="label-tag absolute left-2 top-2">Portada</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Mover antes"
                  isDisabled={index === 0 || reorder.isPending}
                  onPress={() => move(index, index - 1)}
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Mover después"
                  isDisabled={index === images.length - 1 || reorder.isPending}
                  onPress={() => move(index, index + 1)}
                >
                  →
                </Button>
                {index > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={reorder.isPending}
                    onPress={() => move(index, 0)}
                  >
                    Usar de portada
                  </Button>
                )}
              </div>
              <ImageDetails productId={productId} image={image} onChanged={refresh} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ImageDetails({
  productId,
  image,
  onChanged,
}: {
  productId: string;
  image: ProductImageDto;
  onChanged: () => Promise<unknown>;
}) {
  const [alt, setAlt] = useState<Required<ImageAltDto>>({
    es: image.alt.es ?? '',
    en: image.alt.en ?? '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = alt.es !== (image.alt.es ?? '') || alt.en !== (image.alt.en ?? '');

  const saveAlt = useMutation({
    mutationFn: () =>
      api<ProductImageDto>('PATCH', ADMIN_CATALOG_ROUTES.image(productId, image.id), { alt }),
    onSuccess: () => onChanged(),
  });
  const remove = useMutation({
    mutationFn: () => api<void>('DELETE', ADMIN_CATALOG_ROUTES.image(productId, image.id)),
    onSuccess: () => onChanged(),
  });

  return (
    <div className="flex flex-col gap-3">
      <TextField value={alt.es} onChange={(es) => setAlt((current) => ({ ...current, es }))}>
        <Label>Texto alternativo (es)</Label>
        <Input maxLength={200} placeholder="Árbol de cuarzo rosa sobre madera" />
      </TextField>
      <TextField value={alt.en} onChange={(en) => setAlt((current) => ({ ...current, en }))}>
        <Label>Alt text (en)</Label>
        <Input maxLength={200} />
      </TextField>
      <ErrorNotice error={saveAlt.error ?? remove.error} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {dirty && (
          <Button
            size="sm"
            variant="secondary"
            isPending={saveAlt.isPending}
            onPress={() => saveAlt.mutate()}
          >
            Guardar texto
          </Button>
        )}
        {saveAlt.isSuccess && !dirty && <span className="text-[13px] text-sage">Guardado</span>}
        {confirmDelete ? (
          <>
            <span className="text-[13px] text-text-secondary">¿Eliminar foto?</span>
            <Button
              size="sm"
              variant="danger-soft"
              isPending={remove.isPending}
              onPress={() => remove.mutate()}
            >
              Sí, eliminar
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onPress={() => setConfirmDelete(true)}>
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
