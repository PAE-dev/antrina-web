import { type AccountDto, type MyOrderDto } from '@antrina/contracts';
import {
  ACCOUNT_SECURITY,
  type Clock,
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerSessionStore,
  DomainError,
  type IdentityProvider,
  isCustomerSessionActive,
  type OrderRepository,
  type SessionTokenService,
} from '@antrina/domain';

export interface AccountAuthDeps {
  accounts: CustomerAccountRepository;
  sessions: CustomerSessionStore;
  identity: IdentityProvider;
  tokens: SessionTokenService;
  clock: Clock;
}

export interface AccountPrincipal {
  account: CustomerAccount;
  sessionId: string;
}

export interface IssuedAccountSession {
  /** Token opaco para la cookie; en la base solo queda su hash. */
  sessionToken: string;
  expiresAt: Date;
  account: CustomerAccount;
}

export function toAccountDto(account: CustomerAccount): AccountDto {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatarUrl: account.avatarUrl,
    hasPurchases: account.customerId !== null,
  };
}

const notSignedIn = () => new DomainError('Inicia sesión para continuar', 'auth.required');

/**
 * Entrada con Google: el adapter intercambia el código (con PKCE) por una identidad verificada.
 * Crea la cuenta la primera vez, la enlaza con el cliente de ventas de su correo y abre sesión.
 */
export class SignInWithGoogleUseCase {
  constructor(private readonly deps: AccountAuthDeps) {}

  async execute(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    ip: string | null;
    userAgent: string | null;
  }): Promise<IssuedAccountSession> {
    const { accounts, sessions, identity, tokens, clock } = this.deps;
    if (!identity.isConfigured()) {
      throw new DomainError('El acceso con Google no está configurado', 'account.google_disabled');
    }
    const person = await identity.exchangeCode(input);
    if (!person.emailVerified) {
      throw new DomainError('Tu correo de Google no está verificado', 'auth.unverified_email');
    }
    const email = person.email.trim().toLowerCase();
    const now = clock.now();
    const profile = {
      email,
      name: person.name.trim().slice(0, 120) || email.split('@')[0]!,
      avatarUrl: person.picture,
      googleSub: person.sub,
    };

    // La misma persona puede volver con el mismo `sub`; si no, se reconoce por su correo verificado.
    let account =
      (await accounts.findByGoogleSub(person.sub)) ?? (await accounts.findByEmail(email));
    if (account) {
      account = await accounts.updateProfile(account.id, profile, now);
    } else {
      const customerId = await accounts.findLinkableCustomerId(email);
      account = await accounts.create({ ...profile, customerId });
    }
    if (!account.customerId) {
      const customerId = await accounts.findLinkableCustomerId(email);
      if (customerId) {
        await accounts.linkCustomer(account.id, customerId);
        account = { ...account, customerId };
      }
    }

    const { token, tokenHash } = tokens.generate();
    const expiresAt = new Date(now.getTime() + ACCOUNT_SECURITY.sessionTtlMs);
    await sessions.create({
      accountId: account.id,
      tokenHash,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { sessionToken: token, expiresAt, account };
  }
}

/** Cuenta de la cookie, o null. Renueva la sesión (deslizante) como mucho una vez al día. */
export class GetCurrentAccountUseCase {
  constructor(
    private readonly accounts: CustomerAccountRepository,
    private readonly sessions: CustomerSessionStore,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    sessionToken: string | null | undefined;
  }): Promise<(AccountPrincipal & { renewedUntil: Date | null }) | null> {
    if (!input.sessionToken) return null;
    const now = this.clock.now();
    const session = await this.sessions.findByTokenHash(this.tokens.hash(input.sessionToken));
    if (!session) return null;
    if (!isCustomerSessionActive(session, now)) {
      await this.sessions.delete(session.id);
      return null;
    }
    const account = await this.accounts.findById(session.accountId);
    if (!account) {
      await this.sessions.delete(session.id);
      return null;
    }
    let renewedUntil: Date | null = null;
    if (now.getTime() - session.lastSeenAt.getTime() >= ACCOUNT_SECURITY.renewAfterMs) {
      renewedUntil = new Date(now.getTime() + ACCOUNT_SECURITY.sessionTtlMs);
      await this.sessions.touch(session.id, now, renewedUntil);
    }
    return { account, sessionId: session.id, renewedUntil };
  }

  /** Igual que `execute`, pero exige sesión (`auth.required` → 401). */
  async require(input: { sessionToken: string | null | undefined }): Promise<AccountPrincipal> {
    const principal = await this.execute(input);
    if (!principal) throw notSignedIn();
    return principal;
  }
}

export class SignOutAccountUseCase {
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

/** Compras de la persona: los pedidos del cliente de ventas enlazado a su cuenta. */
export class ListMyOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(account: CustomerAccount): Promise<MyOrderDto[]> {
    if (!account.customerId) return [];
    const page = await this.orders.list({ customerId: account.customerId, limit: 50, offset: 0 });
    return page.items.map((order) => ({
      number: order.number,
      status: order.status,
      soldAt: order.soldAt.toISOString(),
      total: { amount: order.totalCents, currency: order.currency },
      lines: order.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: { amount: line.unitPriceCents, currency: order.currency },
      })),
    }));
  }
}
