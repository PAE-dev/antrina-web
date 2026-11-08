import { type CustomerMeDto } from '@antrina/contracts';
import {
  type CustomerProfile,
  DomainError,
  type ImageContentType,
  type ImageStorage,
} from '@antrina/domain';
import { optionalString, requireString } from '../shared/input.js';
import {
  type CustomerSessionDeps,
  requireCustomer,
  toCustomerMeDto,
} from './customer-auth.use-cases.js';

/** Existe en Node y en los navegadores; este paquete no carga los tipos de ninguno. */
declare const atob: (data: string) => string;

const NAME_MIN = 2;
const NAME_MAX = 60;
const PLACE_MAX = 60;
const ADDRESS_MAX = 160;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
const PHONE_FIELD_MAX = 24;
/** El navegador reduce la foto antes de enviarla: esto solo frena a quien se salte ese paso. */
export const MAX_AVATAR_BYTES = 70 * 1024;
const MAX_AVATAR_BASE64 = Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 4;

function cleanOptional(value: unknown, field: string, maxLength: number): string | null {
  const text = optionalString(value, field, maxLength);
  return text?.replace(/\s+/g, ' ').trim() || null;
}

function cleanPhone(value: unknown): string | null {
  const text = cleanOptional(value, 'phone', PHONE_FIELD_MAX);
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  const isValid =
    /^\+?[\d\s()-]+$/.test(text) &&
    digits.length >= PHONE_MIN_DIGITS &&
    digits.length <= PHONE_MAX_DIGITS;
  if (!isValid) {
    throw new DomainError('Revisa tu número de celular', 'customer.invalid_phone');
  }
  return `${text.startsWith('+') ? '+' : ''}${digits}`;
}

function toProfile(input: unknown): CustomerProfile {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = requireString(body.name, 'name', NAME_MAX + 40)
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new DomainError('Escribe tu nombre', 'customer.invalid_name');
  }
  return {
    name,
    phone: cleanPhone(body.phone),
    city: cleanOptional(body.city, 'city', PLACE_MAX),
    district: cleanOptional(body.district, 'district', PLACE_MAX),
    addressLine: cleanOptional(body.addressLine, 'addressLine', ADDRESS_MAX),
    addressReference: cleanOptional(body.addressReference, 'addressReference', ADDRESS_MAX),
  };
}

export class UpdateCustomerProfileUseCase {
  constructor(
    private readonly deps: CustomerSessionDeps,
    private readonly storage: ImageStorage,
  ) {}

  async execute(input: {
    sessionToken: string | null | undefined;
    body: unknown;
  }): Promise<CustomerMeDto> {
    const account = await requireCustomer(this.deps, input.sessionToken);
    const updated = await this.deps.customers.updateProfile(account.id, toProfile(input.body));
    return toCustomerMeDto(updated, this.storage);
  }
}

/** Mira el contenido, no lo que el navegador dice que es: la foto queda en un bucket público. */
function imageTypeOf(bytes: Uint8Array): ImageContentType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  return null;
}

function decodeAvatar(input: unknown): { bytes: Uint8Array; contentType: ImageContentType } {
  const body = (input ?? {}) as Record<string, unknown>;
  const invalid = new DomainError('No pudimos leer esa foto', 'customer.invalid_avatar');
  if (typeof body.imageBase64 !== 'string') throw invalid;
  if (body.imageBase64.length > MAX_AVATAR_BASE64) {
    throw new DomainError('Esa foto es demasiado pesada', 'customer.invalid_avatar');
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(body.imageBase64), (char: string) => char.charCodeAt(0));
  } catch {
    throw invalid;
  }
  const contentType = imageTypeOf(bytes);
  if (!contentType) throw invalid;
  return { bytes, contentType };
}

export class SetCustomerAvatarUseCase {
  constructor(
    private readonly deps: CustomerSessionDeps,
    private readonly storage: ImageStorage,
  ) {}

  async execute(input: {
    sessionToken: string | null | undefined;
    body: unknown;
  }): Promise<CustomerMeDto> {
    const account = await requireCustomer(this.deps, input.sessionToken);
    const { bytes, contentType } = decodeAvatar(input.body);
    const avatarKey = await this.storage.putImage({
      prefix: `customers/${account.id}`,
      contentType,
      bytes,
    });
    const updated = await this.deps.customers.setAvatar(account.id, avatarKey);
    // La foto vieja ya no se usa; si no se pudiera borrar, no debe fallar el cambio.
    if (account.avatarKey) await this.storage.delete(account.avatarKey).catch(() => undefined);
    return toCustomerMeDto(updated, this.storage);
  }
}

export class RemoveCustomerAvatarUseCase {
  constructor(
    private readonly deps: CustomerSessionDeps,
    private readonly storage: ImageStorage,
  ) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<CustomerMeDto> {
    const account = await requireCustomer(this.deps, input.sessionToken);
    const updated = await this.deps.customers.setAvatar(account.id, null);
    if (account.avatarKey) await this.storage.delete(account.avatarKey).catch(() => undefined);
    return toCustomerMeDto(updated, this.storage);
  }
}
