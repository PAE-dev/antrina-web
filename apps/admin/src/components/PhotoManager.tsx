import { Button, Dropdown, Input, Label, Modal, Spinner, TextField, toast } from '@heroui/react';
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
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorNotice } from './ErrorNotice';
import { IconDots, IconUpload } from './icons';

const MAX_IMAGES = 12;

interface UploadItem {
  id: string;
  name: string;
  state: 'processing' | 'uploading' | 'error';
  error?: string;
}

/** Sube un archivo: redimensiona → URL firmada → PUT directo al bucket → registra en la API. */
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
  const [editing, setEditing] = useState<ProductImageDto | null>(null);
  const [deleting, setDeleting] = useState<ProductImageDto | null>(null);

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

  const remove = useMutation({
    mutationFn: (imageId: string) =>
      api<void>('DELETE', ADMIN_CATALOG_ROUTES.image(productId, imageId)),
    onSuccess: async () => {
      setDeleting(null);
      await refresh();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('Foto eliminada');
    },
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
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="panel-heading">
            Fotos{' '}
            <span className="panel-num font-normal text-text-muted">
              {images.length}/{MAX_IMAGES}
            </span>
          </h3>
          <p className="panel-meta">
            La primera es la portada. Arrastra para reordenar. Luz natural y fondos arena, nunca
            blanco puro.
          </p>
        </div>
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
          className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 transition-colors ${
            isDropTarget
              ? 'border-brand bg-brand-tint'
              : 'border-border-strong bg-bg hover:border-text-muted'
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary">
            <IconUpload />
          </span>
          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-text">
              Arrastra fotos o <span className="text-brand">elige archivos</span>
            </span>
            <span className="panel-meta">JPG, PNG o WebP · se optimizan a WebP de 2400 px</span>
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
        <ul className="flex flex-col gap-1.5" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.id} className="flex items-center gap-2 text-[13px] text-text-secondary">
              {upload.state === 'error' ? (
                <span className="text-danger">{upload.error}</span>
              ) : (
                <>
                  <Spinner size="sm" aria-label="Subiendo" />
                  <span className="truncate">
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              className={`group flex flex-col gap-1.5 ${draggedId === image.id ? 'opacity-40' : ''}`}
            >
              <div className="relative aspect-[4/5] cursor-grab overflow-hidden rounded-md border border-border bg-bg-alt active:cursor-grabbing">
                <img
                  src={image.url}
                  alt={image.alt.es ?? ''}
                  loading="lazy"
                  className="size-full object-cover"
                  draggable={false}
                />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-surface px-1.5 py-0.5 text-[11px] font-medium text-text">
                    Portada
                  </span>
                )}
                <div className="absolute right-1.5 top-1.5">
                  <Dropdown>
                    <Dropdown.Trigger
                      aria-label="Acciones de la foto"
                      className="flex size-7 items-center justify-center rounded-sm bg-surface text-text"
                    >
                      <IconDots />
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement="bottom end">
                      <Dropdown.Menu
                        aria-label="Acciones de la foto"
                        disabledKeys={[
                          ...(index === 0 ? ['cover', 'before'] : []),
                          ...(index === images.length - 1 ? ['after'] : []),
                        ]}
                        onAction={(key) => {
                          if (key === 'alt') setEditing(image);
                          if (key === 'cover') move(index, 0);
                          if (key === 'before') move(index, index - 1);
                          if (key === 'after') move(index, index + 1);
                          if (key === 'delete') setDeleting(image);
                        }}
                      >
                        <Dropdown.Item id="alt" textValue="Texto alternativo">
                          Texto alternativo
                        </Dropdown.Item>
                        <Dropdown.Item id="cover" textValue="Usar como portada">
                          Usar como portada
                        </Dropdown.Item>
                        <Dropdown.Item id="before" textValue="Mover antes">
                          Mover antes
                        </Dropdown.Item>
                        <Dropdown.Item id="after" textValue="Mover después">
                          Mover después
                        </Dropdown.Item>
                        <Dropdown.Item id="delete" textValue="Eliminar" variant="danger">
                          Eliminar
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(image)}
                className={`truncate text-left text-[12px] hover:underline ${
                  image.alt.es ? 'text-text-secondary' : 'text-warning'
                }`}
              >
                {image.alt.es ?? 'Falta texto alternativo'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AltTextModal
          key={editing.id}
          productId={productId}
          image={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar esta foto?"
        confirmLabel="Eliminar"
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      >
        Se quitará del producto y de la tienda. Esta acción no se puede deshacer.
        {remove.error ? (
          <span className="mt-3 block">
            <ErrorNotice error={remove.error} title="No se pudo eliminar" />
          </span>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function AltTextModal({
  productId,
  image,
  onClose,
  onSaved,
}: {
  productId: string;
  image: ProductImageDto;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [alt, setAlt] = useState<Required<ImageAltDto>>({
    es: image.alt.es ?? '',
    en: image.alt.en ?? '',
  });

  const save = useMutation({
    mutationFn: () =>
      api<ProductImageDto>('PATCH', ADMIN_CATALOG_ROUTES.image(productId, image.id), { alt }),
    onSuccess: async () => {
      await onSaved();
      toast.success('Texto alternativo guardado');
      onClose();
    },
  });

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading className="text-[15px] font-semibold tracking-[-0.01em]">
              Texto alternativo
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex gap-4">
            <img
              src={image.url}
              alt=""
              className="aspect-[4/5] w-24 shrink-0 rounded-md border border-border bg-bg-alt object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <TextField
                value={alt.es}
                onChange={(es) => setAlt((current) => ({ ...current, es }))}
              >
                <Label>Español</Label>
                <Input maxLength={200} placeholder="Árbol de cuarzo rosa sobre madera" autoFocus />
              </TextField>
              <TextField
                value={alt.en}
                onChange={(en) => setAlt((current) => ({ ...current, en }))}
              >
                <Label>English</Label>
                <Input maxLength={200} placeholder="Rose quartz tree on wood" />
              </TextField>
              <p className="panel-meta">Describe la foto para lectores de pantalla y buscadores.</p>
              <ErrorNotice error={save.error} title="No se pudo guardar" />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button size="sm" variant="tertiary" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="primary"
              isPending={save.isPending}
              onPress={() => save.mutate()}
            >
              Guardar
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
