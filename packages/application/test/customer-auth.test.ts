import {
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerSession,
  type CustomerSessionStore,
  CUSTOMER_SESSION_TTL_MS,
  type DomainError,
  type GoogleIdentity,
  type GoogleIdentityProvider,
  type NewCustomerSession,
  type SessionTokenService,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CompleteGoogleSignInUseCase,
  CustomerLogoutUseCase,
  GetCurrentCustomerUseCase,
  StartGoogleSignInUseCase,
} from '../src/index.js';
import { FakeClock } from './fakes.js';

const ANA: GoogleIdentity = {
  subject: 'google-1',
  email: 'ana@example.com',
  emailVerified: true,
  name: 'Ana',
};

class FakeGoogle implements GoogleIdentityProvider {
  enabled = true;
  identity = ANA;
  exchanges = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  createAuthorization() {
    return { url: 'https://google.test', state: 'state', nonce: 'nonce', codeVerifier: 'verifier' };
  }

  async exchangeCode(): Promise<GoogleIdentity> {
    this.exchanges += 1;
    return this.identity;
  }
}

class InMemoryCustomers implements CustomerAccountRepository {
  readonly bySubject = new Map<string, CustomerAccount>();

  async findById(id: string): Promise<CustomerAccount | null> {
    return [...this.bySubject.values()].find((account) => account.id === id) ?? null;
  }

  async findByGoogleSubject(subject: string): Promise<CustomerAccount | null> {
    return this.bySubject.get(subject) ?? null;
  }

  async createFromGoogle(identity: GoogleIdentity): Promise<CustomerAccount> {
    const account = {
      id: `customer-${this.bySubject.size + 1}`,
      name: identity.name,
      email: identity.email,
    };
    this.bySubject.set(identity.subject, account);
    return account;
  }

  async recordGoogleLogin(id: string, identity: GoogleIdentity): Promise<CustomerAccount> {
    const account = { ...(await this.findById(id))!, email: identity.email };
    this.bySubject.set(identity.subject, account);
    return account;
  }
}

class InMemorySessions implements CustomerSessionStore {
  readonly byHash = new Map<string, CustomerSession>();

  async create(input: NewCustomerSession): Promise<CustomerSession> {
    const session = {
      id: `session-${this.byHash.size + 1}`,
      customerId: input.customerId,
      expiresAt: input.expiresAt,
    };
    this.byHash.set(input.tokenHash, session);
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerSession | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async delete(id: string): Promise<void> {
    for (const [hash, session] of this.byHash) if (session.id === id) this.byHash.delete(hash);
  }

  async deleteExpired(now: Date): Promise<void> {
    for (const [hash, session] of this.byHash) {
      if (session.expiresAt <= now) this.byHash.delete(hash);
    }
  }
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

describe('acceso de clientes con Google', () => {
  let google: FakeGoogle;
  let customers: InMemoryCustomers;
  let sessions: InMemorySessions;
  let clock: FakeClock;
  let complete: CompleteGoogleSignInUseCase;
  let current: GetCurrentCustomerUseCase;
  let counter: number;

  const tokens: SessionTokenService = {
    generate: () => {
      counter += 1;
      return { token: `token-${counter}`, tokenHash: `hash:token-${counter}` };
    },
    hash: (token) => `hash:${token}`,
  };
  const input = {
    code: 'code',
    state: 'state',
    expectedState: 'state',
    codeVerifier: 'verifier',
    nonce: 'nonce',
    userAgent: 'vitest',
  };

  beforeEach(() => {
    counter = 0;
    google = new FakeGoogle();
    customers = new InMemoryCustomers();
    sessions = new InMemorySessions();
    clock = new FakeClock();
    complete = new CompleteGoogleSignInUseCase(google, customers, sessions, tokens, clock);
    current = new GetCurrentCustomerUseCase(customers, sessions, tokens, clock);
  });

  it('no inicia el acceso si Google no está configurado', () => {
    google.enabled = false;
    const start = new StartGoogleSignInUseCase(google);
    expect(() => start.execute()).toThrowError(
      expect.objectContaining({ code: 'auth.google_unavailable' }) as Error,
    );
  });

  it('crea la cuenta la primera vez y abre una sesión de 30 días', async () => {
    const result = await complete.execute(input);

    expect(result.customer).toEqual({ id: 'customer-1', name: 'Ana', email: 'ana@example.com' });
    expect(result.expiresAt.getTime()).toBe(clock.now().getTime() + CUSTOMER_SESSION_TTL_MS);
    await expect(current.execute({ sessionToken: result.sessionToken })).resolves.toEqual(
      result.customer,
    );
  });

  it('reutiliza la cuenta por su identificador de Google aunque cambie el correo', async () => {
    await complete.execute(input);
    google.identity = { ...ANA, email: 'nuevo@example.com' };

    const result = await complete.execute(input);

    expect(result.customer).toEqual({ id: 'customer-1', name: 'Ana', email: 'nuevo@example.com' });
    expect(customers.bySubject.size).toBe(1);
  });

  it('rechaza un state distinto antes de hablar con Google', async () => {
    await expectCode(complete.execute({ ...input, state: 'otro' }), 'auth.invalid_state');
    await expectCode(
      complete.execute({ ...input, state: '', expectedState: '' }),
      'auth.invalid_state',
    );
    expect(google.exchanges).toBe(0);
  });

  it('rechaza un correo sin verificar', async () => {
    google.identity = { ...ANA, emailVerified: false };
    await expectCode(complete.execute(input), 'auth.google_unverified');
    expect(customers.bySubject.size).toBe(0);
  });

  it('solo guarda el hash del token', async () => {
    const { sessionToken } = await complete.execute(input);
    expect(sessions.byHash.has(sessionToken)).toBe(false);
    expect(sessions.byHash.has(`hash:${sessionToken}`)).toBe(true);
  });

  it('rechaza una sesión caducada o sin cookie', async () => {
    await expectCode(current.execute({ sessionToken: null }), 'auth.unauthorized');
    await expectCode(current.execute({ sessionToken: 'inventado' }), 'auth.unauthorized');

    const { sessionToken } = await complete.execute(input);
    clock.current = new Date(clock.now().getTime() + CUSTOMER_SESSION_TTL_MS);

    await expectCode(current.execute({ sessionToken }), 'auth.unauthorized');
    expect(sessions.byHash.size).toBe(0);
  });

  it('cerrar sesión invalida la cookie', async () => {
    const { sessionToken } = await complete.execute(input);
    await new CustomerLogoutUseCase(sessions, tokens).execute({ sessionToken });
    await expectCode(current.execute({ sessionToken }), 'auth.unauthorized');
  });
});
