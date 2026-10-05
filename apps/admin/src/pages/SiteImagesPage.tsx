import { Button, Input, Label, Skeleton, Spinner, TextField, toast } from '@heroui/react';
import {
  ADMIN_SITE_ROUTES,
  type AdminSiteImageDto,
  type AdminSiteImagesResponse,
  type ImageUploadTargetDto,
  SITE_IMAGE_SLOT_CODES,
  type SiteImageSlotCode,
} from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconExternal, IconImage, IconUpload } from '../components/icons';
import { api, STORE_URL } from '../lib/api';
import { formatDate } from '../lib/format';
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../lib/image';

const QUERY_KEY = ['admin', 'site-images'];

const SLOTS: Record<
  SiteImageSlotCode,
  { title: string; where: string; aspect: string; ratio: string; altHint: string }
> = {
  hero: {
    title: 'Foto principal',
    where: 'Lo primero que se ve al entrar a la tienda, junto al título.',
    aspect: 'aspect-[4/5]',
    ratio: 'Vertical 4:5 (por ejemplo 1600 × 2000 px)',
    altHint: 'Árbol de amatista y cuarzo rosa sobre mesa de madera',
  },
  story: {
    title: 'Foto del taller',
    where: 'Sección “Hecho a mano en Lima”: manos, alambre, piedras, el taller.',
    aspect: 'aspect-[4/5]',
    ratio: 'Vertical 4:5',
    altHint: 'Manos armando las ramas de un árbol de cuarzo',
  },
  corporate: {
    title: 'Foto de regalos corporativos',
    where: 'Bloque de empresas: varios árboles, cajas de regalo, una oficina.',
    aspect: 'aspect-[4/3]',
    ratio: 'Horizontal 4:3',
    altHint: 'Árboles mini con cajas de regalo para empresas',
  },
};

async function uploadSiteImage(slot: SiteImageSlotCode, file: File): Promise<AdminSiteImageDto> {
  const prepared = await prepareImage(file);
  const target = await api<ImageUploadTargetDto>('POST', ADMIN_SITE_ROUTES.imageUploadUrl(slot), {
    contentType: 'image/webp',
    sizeBytes: prepared.blob.size,
  });
  const upload = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: target.headers,
    body: prepared.blob,
  }).catch(() => null);
  if (!upload?.ok) throw new Error('El almacenamiento rechazó la subida. Inténtalo de nuevo.');
  return api<AdminSiteImageDto>('PUT', ADMIN_SITE_ROUTES.image(slot), {
    storageKey: target.storageKey,
    width: prepared.width,
    height: prepared.height,
    alt: {},
  });
}

/** Fotos editoriales de la tienda: portada, taller y empresas. */
export function SiteImagesPage() {
  const images = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api<AdminSiteImagesResponse>('GET', ADMIN_SITE_ROUTES.images),
  });
  const bySlot = new Map(images.data?.data.map((image) => [image.slot, image]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="panel-title">Portada</h1>
          <p className="text-[13.5px] text-text-secondary">
            Fotos de la página de inicio. Los cambios aparecen en la tienda en un minuto.
          </p>
        </div>
        {STORE_URL && (
          <Button
            variant="tertiary"
            size="md"
            onPress={() => window.open(STORE_URL, '_blank', 'noreferrer')}
          >
            <IconExternal />
            Ver la portada
          </Button>
        )}
      </div>

      {images.error ? (
        <ErrorNotice error={images.error} title="No se pudieron cargar las fotos" />
      ) : (
        <ul className="flex flex-col gap-4">
          {SITE_IMAGE_SLOT_CODES.map((slot) => (
            <li key={slot}>
              {images.isPending ? (
                <SlotSkeleton />
              ) : (
                <SlotCard
                  key={bySlot.get(slot)?.url ?? slot}
                  slot={slot}
                  image={bySlot.get(slot)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="panel-card flex gap-5 p-4">
      <Skeleton className="aspect-[4/5] w-32 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-40 rounded-sm" />
        <Skeleton className="h-3 w-64 rounded-sm" />
      </div>
    </div>
  );
}

function SlotCard({ slot, image }: { slot: SiteImageSlotCode; image?: AdminSiteImageDto }) {
  const info = SLOTS[slot];
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState({ es: image?.alt.es ?? '', en: image?.alt.en ?? '' });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const upload = useMutation({
    mutationFn: (file: File) => uploadSiteImage(slot, file),
    onSuccess: async () => {
      await refresh();
      toast.success(image ? 'Foto cambiada' : 'Foto subida', {
        description: 'Escribe una descripción corta: ayuda a Google y a la accesibilidad.',
      });
    },
  });
  const saveAlt = useMutation({
    mutationFn: () => api<AdminSiteImageDto>('PATCH', ADMIN_SITE_ROUTES.image(slot), { alt }),
    onSuccess: async () => {
      await refresh();
      toast.success('Descripción guardada');
    },
  });
  const remove = useMutation({
    mutationFn: () => api<void>('DELETE', ADMIN_SITE_ROUTES.image(slot)),
    onSuccess: async () => {
      setConfirmRemove(false);
      await refresh();
      toast.success('Foto quitada', { description: 'La tienda vuelve a mostrar el hueco vacío.' });
    },
  });

  const altChanged = alt.es !== (image?.alt.es ?? '') || alt.en !== (image?.alt.en ?? '');

  return (
    <article className="panel-card flex flex-col gap-5 p-4 sm:flex-row">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        aria-label={
          image ? `Cambiar ${info.title.toLowerCase()}` : `Subir ${info.title.toLowerCase()}`
        }
        className={`relative flex w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg-alt text-text-muted sm:w-40 ${info.aspect}`}
      >
        {image ? (
          <img src={image.url} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-[12px]">
            <IconImage size={18} />
            Sin foto
          </span>
        )}
        {upload.isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-surface/80">
            <Spinner size="sm" aria-label="Subiendo" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
          event.target.value = '';
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="panel-heading">{info.title}</h2>
            <p className="text-[13px] text-text-secondary">{info.where}</p>
            <p className="panel-meta">
              {info.ratio}
              {image ? ` · actualizada ${formatDate(image.updatedAt)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {image && (
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onPress={() => setConfirmRemove(true)}
              >
                Quitar
              </Button>
            )}
            <Button
              size="sm"
              variant={image ? 'tertiary' : 'primary'}
              isPending={upload.isPending}
              onPress={() => inputRef.current?.click()}
            >
              <IconUpload />
              {image ? 'Cambiar foto' : 'Subir foto'}
            </Button>
          </div>
        </div>

        <ErrorNotice error={upload.error} title="No se pudo subir la foto" />

        {image && (
          <form
            className="flex flex-col gap-3 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveAlt.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                value={alt.es}
                onChange={(es) => setAlt((current) => ({ ...current, es }))}
              >
                <Label>Descripción de la foto</Label>
                <Input maxLength={200} placeholder={info.altHint} />
              </TextField>
              <TextField
                value={alt.en}
                onChange={(en) => setAlt((current) => ({ ...current, en }))}
              >
                <Label>English</Label>
                <Input maxLength={200} placeholder="Optional" />
              </TextField>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className={`panel-meta ${alt.es.trim() ? '' : 'text-warning'}`}>
                {alt.es.trim()
                  ? 'Google la usa para entender la foto.'
                  : 'Falta la descripción: Google la usa para entender la foto.'}
              </p>
              <Button
                type="submit"
                size="sm"
                variant="tertiary"
                isDisabled={!altChanged}
                isPending={saveAlt.isPending}
              >
                Guardar descripción
              </Button>
            </div>
            <ErrorNotice error={saveAlt.error} title="No se pudo guardar" />
          </form>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="¿Quitar esta foto?"
        confirmLabel="Quitar"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
      >
        La tienda mostrará el hueco vacío hasta que subas otra.
        {remove.error ? (
          <span className="mt-3 block">
            <ErrorNotice error={remove.error} title="No se pudo quitar" />
          </span>
        ) : null}
      </ConfirmDialog>
    </article>
  );
}
