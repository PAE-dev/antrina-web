import { type CustomerMeDto } from '@antrina/contracts';
import {
  type Clock,
  type CustomerAccount,
  type CustomerAccountRepository,
  CUSTOMER_SESSION_TTL_MS,
  type CustomerSessionStore,
  DomainError,
  type GoogleAuthorization,
  type GoogleIdentity,
  type GoogleIdentityProvider,
  type ImageUrlResolver,
  isCustomerSessionActive,
  type SessionTokenService,
} from '@antrina/domain';

function unauthorized(): DomainError {
  return new DomainError('Inicia sesión para continuar', 'auth.unauthorized');
}

export function toCustomerMeDto(account: CustomerAccount, urls: ImageUrlResolver): CustomerMeDto {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    avatarUrl: account.avatarKey ? urls.publicUrl(account.avatarKey) : null,
    city: account.city,
    district: account.district,
    addressLine: account.addressLine,
    addressReference: account.addressReference,
  };
}

/** Prepara la ida a Google. */
export class StartGoogleSignInUseCase {
  constructor(private readonly google: GoogleIdentityProvider) {}

  execute(): GoogleAuthorization {
    if (!this.google.isEnabled()) {
      throw new DomainError('El acceso con Google no está disponible', 'auth.google_unavailable');
    }
    return this.google.createAuthorization();
  }
}

export interface CompleteGoogleSignInInput {
  code: string;
  /** `state` que devuelve Google y el que guardamos en la cookie: protegen frente a CSRF. */
  state: string;
  expectedState: string;
  codeVerifier: string;
  nonce: string;
  userAgent: string | null;
}

export interface CustomerSignInResult {
  sessionToken: string;
  expiresAt: Date;
  customer: CustomerMeDto;
}

/** Valida la vuelta de Google, crea el cliente si es su primera vez y abre la sesión. */
export class CompleteGoogleSignInUseCase {
  constructor(
    private readonly google: GoogleIdentityProvider,
    private readonly customers: CustomerAccountRepository,
    private readonly sessions: CustomerSessionStore,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
    private readonly urls: ImageUrlResolver,
  ) {}

  async execute(input: CompleteGoogleSignInInput): Promise<CustomerSignInResult> {
    if (input.state.length === 0 || input.state !== input.expectedState) {
      throw new DomainError('La solicitud de acceso no es válida', 'auth.invalid_state');
    }
    const identity = await this.google.exchangeCode({
      code: input.code,
      codeVerifier: input.codeVerifier,
      nonce: input.nonce,
    });
    if (!identity.emailVerified) {
      throw new DomainError('Tu correo de Google no está verificado', 'auth.google_unverified');
    }

    const now = this.clock.now();
    const account = await this.findOrCreate(identity, now);
    await this.sessions.deleteExpired(now);
    const { token, tokenHash } = this.tokens.generate();
    const expiresAt = new Date(now.getTime() + CUSTOMER_SESSION_TTL_MS);
    await this.sessions.create({
      customerId: account.id,
      tokenHash,
      expiresAt,
      userAgent: input.userAgent,
    });
    return { sessionToken: token, expiresAt, customer: toCustomerMeDto(account, this.urls) };
  }

  /**
   * Nunca enlaza por correo con un cliente creado en el panel: ese correo lo escribió el taller y
   * no está verificado, así que hacerlo daría acceso a la ficha de otra persona si hay un error.
   */
  private async findOrCreate(identity: GoogleIdentity, now: Date): Promise<CustomerAccount> {
    const existing = await this.customers.findByGoogleSubject(identity.subject);
    return existing
      ? this.customers.recordGoogleLogin(existing.id, identity, now)
      : this.customers.createFromGoogle(identity, now);
  }
}

/** Resuelve el cliente de una cookie de sesión. */
export interface CustomerSessionDeps {
  customers: CustomerAccountRepository;
  sessions: CustomerSessionStore;
  tokens: SessionTokenService;
  clock: Clock;
}

/** Quién hace la petición; si la sesión ya no vale, la borra. */
export async function requireCustomer(
  deps: CustomerSessionDeps,
  sessionToken: string | null | undefined,
): Promise<CustomerAccount> {
  if (!sessionToken) throw unauthorized();
  const session = await deps.sessions.findByTokenHash(deps.tokens.hash(sessionToken));
  if (!session) throw unauthorized();
  if (!isCustomerSessionActive(session, deps.clock.now())) {
    await deps.sessions.delete(session.id);
    throw unauthorized();
  }
  const account = await deps.customers.findById(session.customerId);
  if (!account) {
    await deps.sessions.delete(session.id);
    throw unauthorized();
  }
  return account;
}

export class GetCurrentCustomerUseCase {
  constructor(
    private readonly deps: CustomerSessionDeps,
    private readonly urls: ImageUrlResolver,
  ) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<CustomerMeDto> {
    return toCustomerMeDto(await requireCustomer(this.deps, input.sessionToken), this.urls);
  }
}

export class CustomerLogoutUseCase {
  constructor(
    private readonly sessions: CustomerSessionStore,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<void> {
    if (!input.sessionToken) return;
    const session = await this.sessions.findByTokenHash(this.tokens.hash(input.sessionToken));
    if (session) await this.sessions.delete(session.id);
  }
}
