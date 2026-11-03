import {
  CUSTOMER_AUTH_ROUTES,
  type CustomerMeDto,
  type SetCustomerAvatarRequest,
  type UpdateCustomerProfileRequest,
} from '@antrina/contracts';
import { ButtonLink, GoogleIcon } from '@antrina/ui';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toritoRequest } from '../torito/toritos-api';
import { InstallRow } from './AppSheets';

const AVATAR_SIZE = 384;
const AVATAR_MAX_BYTES = 64 * 1024;
const AVATAR_QUALITIES = [0.85, 0.72, 0.6, 0.45];
const SAVED_MS = 2600;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

function readBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(blob);
  });
}

/** Recorta al centro y reduce: se sube una foto liviana, no la original de 5 MB del celular. */
async function prepareAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
    for (const quality of AVATAR_QUALITIES) {
      // Safari no sabe crear WebP: entrega PNG, que pesaría de más, así que ahí se usa JPEG.
      const webp = await toBlob(canvas, 'image/webp', quality);
      const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg', quality);
      if (blob && blob.size <= AVATAR_MAX_BYTES) return readBase64(blob);
    }
    throw new Error('size');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''}`.toUpperCase();
}

const emptyText = (value: string | null) => value ?? '';

function formFrom(customer: CustomerMeDto) {
  return {
    name: customer.name,
    phone: emptyText(customer.phone),
    city: emptyText(customer.city),
    district: emptyText(customer.district),
    addressLine: emptyText(customer.addressLine),
    addressReference: emptyText(customer.addressReference),
  };
}

type ProfileForm = ReturnType<typeof formFrom>;

function Field({
  label,
  value,
  onChange,
  hint,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  inputMode?: 'text' | 'tel';
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <input
        {...input}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      {hint && <span className="app-field-hint">{hint}</span>}
    </label>
  );
}

export function ProfileScreen({
  customer,
  returnPath,
  stats,
  onCustomerChange,
  onOpenWorld,
}: {
  customer: CustomerMeDto | null;
  returnPath: string;
  stats: readonly { label: string; value: string }[];
  onCustomerChange: (customer: CustomerMeDto) => void;
  onOpenWorld: () => void;
}) {
  if (!customer) {
    return (
      <div className="app-page app-page-narrow">
        <header className="app-page-head">
          <h2 className="font-display">Tu cuenta</h2>
          <p>Entra para que tus mundos y tus datos te sigan en cualquier celular o computadora.</p>
        </header>
        <div className="world-card">
          <ButtonLink
            href={`${CUSTOMER_AUTH_ROUTES.googleStart}?next=${encodeURIComponent(returnPath)}`}
            variant="inverse"
            className="w-full bg-on-dark text-text hover:opacity-90"
          >
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface">
              <GoogleIcon />
            </span>
            Continuar con Google
          </ButtonLink>
          <p className="app-field-hint">Sin contraseñas: tu cuenta se crea al instante.</p>
        </div>
        <section className="world-card">
          <InstallRow />
          <a className="app-sheet-link" href="/">
            Ir a la tienda completa
          </a>
        </section>
      </div>
    );
  }
  return (
    <SignedInProfile
      key={customer.id}
      customer={customer}
      stats={stats}
      onCustomerChange={onCustomerChange}
      onOpenWorld={onOpenWorld}
    />
  );
}

function SignedInProfile({
  customer,
  stats,
  onCustomerChange,
  onOpenWorld,
}: {
  customer: CustomerMeDto;
  stats: readonly { label: string; value: string }[];
  onCustomerChange: (customer: CustomerMeDto) => void;
  onOpenWorld: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>(() => formFrom(customer));
  const [isSaving, setIsSaving] = useState(false);
  const [wasSaved, setWasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!wasSaved) return;
    const timer = window.setTimeout(() => setWasSaved(false), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [wasSaved]);

  const isDirty = useMemo(() => {
    const saved = formFrom(customer);
    return (Object.keys(form) as (keyof ProfileForm)[]).some((key) => form[key] !== saved[key]);
  }, [customer, form]);

  // Lo que falta, en orden de cuánto ayuda a la hora de comprar.
  const missing = [
    !customer.phone && 'tu celular',
    !customer.addressLine && 'tu dirección',
    !customer.avatarUrl && 'tu foto',
  ].filter((item): item is string => Boolean(item));
  const steps = 4;
  const percent = Math.round(((steps - missing.length) / steps) * 100);

  const set = (key: keyof ProfileForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setWasSaved(false);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const body: UpdateCustomerProfileRequest = {
      name: form.name,
      phone: form.phone || null,
      city: form.city || null,
      district: form.district || null,
      addressLine: form.addressLine || null,
      addressReference: form.addressReference || null,
    };
    try {
      const updated = await toritoRequest<CustomerMeDto>('PUT', CUSTOMER_AUTH_ROUTES.profile, body);
      onCustomerChange(updated);
      setForm(formFrom(updated));
      setWasSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos guardar tus datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsUploading(true);
    setPhotoError(null);
    try {
      const body: SetCustomerAvatarRequest = { imageBase64: await prepareAvatar(file) };
      onCustomerChange(
        await toritoRequest<CustomerMeDto>('PUT', CUSTOMER_AUTH_ROUTES.avatar, body),
      );
    } catch {
      setPhotoError('No pudimos usar esa foto. Prueba con otra.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async () => {
    setPhotoError(null);
    try {
      onCustomerChange(await toritoRequest<CustomerMeDto>('DELETE', CUSTOMER_AUTH_ROUTES.avatar));
    } catch {
      setPhotoError('No pudimos quitar tu foto. Inténtalo otra vez.');
    }
  };

  return (
    <div className="app-page app-page-narrow">
      <section className="profile-hero">
        <button
          type="button"
          className="profile-avatar"
          aria-label={customer.avatarUrl ? 'Cambiar mi foto' : 'Agregar mi foto'}
          disabled={isUploading}
          onClick={() => fileRef.current?.click()}
        >
          {customer.avatarUrl ? (
            <img src={customer.avatarUrl} alt="" width={112} height={112} />
          ) : (
            <span className="profile-initials font-display">{initialsOf(customer.name)}</span>
          )}
          <span
            className={`profile-avatar-badge ${isUploading ? 'is-busy' : ''}`}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={pickPhoto}
        />
        <h2 className="font-display">{customer.name}</h2>
        <p className="app-break">{customer.email}</p>
        {isUploading && <p className="app-field-hint">Subiendo tu foto…</p>}
        {customer.avatarUrl && !isUploading && (
          <button type="button" className="profile-remove" onClick={removePhoto}>
            Quitar foto
          </button>
        )}
        {photoError && (
          <p role="alert" className="app-sheet-error">
            {photoError}
          </p>
        )}
      </section>

      <dl className="app-sheet-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {missing.length > 0 && (
        <section className="world-card">
          <div className="profile-progress-head">
            <span className="world-card-label">Tu perfil</span>
            <span className="profile-progress-value">{percent} %</span>
          </div>
          <span className="profile-progress" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
          <p>Agrega {missing.join(', ').replace(/, ([^,]*)$/, ' y $1')} para pedir en un toque.</p>
        </section>
      )}

      <form className="profile-form" onSubmit={save} noValidate>
        <section className="world-card">
          <h3 className="font-display">Mis datos</h3>
          <Field
            label="Nombre"
            value={form.name}
            onChange={set('name')}
            autoComplete="name"
            maxLength={60}
            required
          />
          <Field
            label="Celular"
            value={form.phone}
            onChange={set('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+51 987 654 321"
            maxLength={24}
            hint="Lo usamos para coordinar tus pedidos por WhatsApp."
          />
        </section>

        <section className="world-card">
          <h3 className="font-display">Dónde enviamos tus piezas</h3>
          <div className="profile-field-row">
            <Field
              label="Ciudad"
              value={form.city}
              onChange={set('city')}
              autoComplete="address-level1"
              placeholder="Lima"
              maxLength={60}
            />
            <Field
              label="Distrito"
              value={form.district}
              onChange={set('district')}
              autoComplete="address-level2"
              placeholder="Miraflores"
              maxLength={60}
            />
          </div>
          <Field
            label="Dirección"
            value={form.addressLine}
            onChange={set('addressLine')}
            autoComplete="street-address"
            placeholder="Av. Larco 123, dpto. 401"
            maxLength={160}
          />
          <Field
            label="Referencia"
            value={form.addressReference}
            onChange={set('addressReference')}
            placeholder="Frente al parque, puerta azul"
            maxLength={160}
          />
        </section>

        {error && (
          <p role="alert" className="app-sheet-error">
            {error}
          </p>
        )}
        {(isDirty || wasSaved) && (
          <div className="profile-save">
            <button
              type="submit"
              className="world-primary world-primary-full"
              disabled={!isDirty || isSaving}
            >
              {isSaving ? 'Guardando…' : wasSaved && !isDirty ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>

      <section className="world-card profile-links">
        <button type="button" className="profile-link" onClick={onOpenWorld}>
          Mis toritos
        </button>
        <a className="profile-link" href="/">
          Tienda completa
        </a>
        <InstallRow asRow />
        <form
          method="post"
          action={`${CUSTOMER_AUTH_ROUTES.logout}?next=${encodeURIComponent('/mundos')}`}
        >
          <button type="submit" className="profile-link is-quiet">
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
