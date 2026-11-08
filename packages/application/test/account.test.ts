import {
  ACCOUNT_SECURITY,
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerSession,
  type CustomerSessionStore,
  type DomainError,
  type IdentityProvider,
  type NewCustomerAccount,
  type NewCustomerSession,
  type SkyBond,
  type SkyProfile,
  type SkyProfileInput,
  type SkyQuestion,
  type SkyRepository,
  type SkyTopic,
  type VerifiedIdentity,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  DeleteSkyBondUseCase,
  GetCurrentAccountUseCase,
  GetSkyDataUseCase,
  SaveSkyProfileUseCase,
  SignInWithGoogleUseCase,
  SignOutAccountUseCase,
} from '../src/index.js';
import { FakeClock, fakeTokens } from './fakes.js';

class InMemoryAccounts implements CustomerAccountRepository {
  readonly items = new Map<string, CustomerAccount>();
  /** Clientes de ventas por correo (simula la tabla Customer). */
  customersByEmail = new Map<string, string[]>();
  private seq = 0;
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByGoogleSub(sub: string) {
    return [...this.items.values()].find((a) => a.googleSub === sub) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.items.values()].find((a) => a.email === email) ?? null;
  }
  async create(input: NewCustomerAccount) {
    const account: CustomerAccount = {
      id: `acc-${++this.seq}`,
      ...input,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    this.items.set(account.id, account);
    return account;
  }
  async updateProfile(
    id: string,
    input: { email: string; name: string; avatarUrl: string | null; googleSub: string },
    now: Date,
  ) {
    const next = { ...this.items.get(id)!, ...input, lastLoginAt: now };
    this.items.set(id, next);
    return next;
  }
  async linkCustomer(id: string, customerId: string) {
    this.items.set(id, { ...this.items.get(id)!, customerId });
  }
  async findLinkableCustomerId(email: string) {
    const ids = this.customersByEmail.get(email) ?? [];
    const taken = new Set([...this.items.values()].map((a) => a.customerId));
    return ids.length === 1 && !taken.has(ids[0]!) ? ids[0]! : null;
  }
}

class InMemoryCustomerSessions implements CustomerSessionStore {
  readonly items = new Map<string, CustomerSession & { tokenHash: string }>();
  private seq = 0;
  constructor(private readonly clock: FakeClock) {}
  async create(input: NewCustomerSession) {
    const session = {
      id: `ses-${++this.seq}`,
      accountId: input.accountId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      lastSeenAt: this.clock.now(),
    };
    this.items.set(session.id, session);
    return session;
  }
  async findByTokenHash(tokenHash: string) {
    return [...this.items.values()].find((s) => s.tokenHash === tokenHash) ?? null;
  }
  async touch(id: string, now: Date, expiresAt?: Date) {
    const s = this.items.get(id)!;
    this.items.set(id, { ...s, lastSeenAt: now, expiresAt: expiresAt ?? s.expiresAt });
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}

class FakeGoogle implements IdentityProvider {
  configured = true;
  identity: VerifiedIdentity = {
    sub: 'google-1',
    email: 'Luz@Ejemplo.com',
    emailVerified: true,
    name: 'Luz',
    picture: null,
  };
  isConfigured() {
    return this.configured;
  }
  authorizationUrl() {
    return 'https://accounts.example/auth';
  }
  async exchangeCode() {
    return this.identity;
  }
}

class InMemorySky implements SkyRepository {
  profiles = new Map<string, SkyProfile>();
  questions: (SkyQuestion & { accountId: string })[] = [];
  bonds: (SkyBond & { accountId: string })[] = [];
  private seq = 0;
  async getProfile(accountId: string) {
    return this.profiles.get(accountId) ?? null;
  }
  async saveProfile(accountId: string, input: SkyProfileInput) {
    const profile = { accountId, ...input, updatedAt: new Date() };
    this.profiles.set(accountId, profile);
    return profile;
  }
  async deleteAll(accountId: string) {
    this.profiles.delete(accountId);
    this.questions = this.questions.filter((q) => q.accountId !== accountId);
    this.bonds = this.bonds.filter((b) => b.accountId !== accountId);
  }
  async listQuestions(accountId: string, limit: number) {
    return this.questions.filter((q) => q.accountId === accountId).slice(0, limit);
  }
  async addQuestion(
    accountId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ) {
    this.questions = this.questions.filter(
      (q) => !(q.accountId === accountId && q.question === input.question),
    );
    const q = { id: `q-${++this.seq}`, accountId, ...input, createdAt: new Date() };
    this.questions.unshift(q);
    const mine = this.questions.filter((x) => x.accountId === accountId);
    const drop = new Set(mine.slice(keep).map((x) => x.id));
    this.questions = this.questions.filter((x) => !drop.has(x.id));
    return q;
  }
  async listBonds(accountId: string) {
    return this.bonds.filter((b) => b.accountId === accountId);
  }
  async countBonds(accountId: string) {
    return this.bonds.filter((b) => b.accountId === accountId).length;
  }
  async addBond(accountId: string, input: { name: string; birthDate: string }) {
    const b = { id: `b-${++this.seq}`, accountId, ...input, createdAt: new Date() };
    this.bonds.push(b);
    return b;
  }
  async deleteBond(accountId: string, bondId: string) {
    const before = this.bonds.length;
    this.bonds = this.bonds.filter((b) => !(b.id === bondId && b.accountId === accountId));
    return this.bonds.length < before;
  }
}

const ctx = {
  code: 'abc',
  codeVerifier: 'v',
  redirectUri: 'http://api/cb',
  ip: null,
  userAgent: null,
};

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

describe('cuentas de cliente (Google)', () => {
  let clock: FakeClock;
  let accounts: InMemoryAccounts;
  let sessions: InMemoryCustomerSessions;
  let google: FakeGoogle;
  let signIn: SignInWithGoogleUseCase;
  let current: GetCurrentAccountUseCase;
  const tokens = fakeTokens();

  beforeEach(() => {
    clock = new FakeClock();
    accounts = new InMemoryAccounts();
    sessions = new InMemoryCustomerSessions(clock);
    google = new FakeGoogle();
    signIn = new SignInWithGoogleUseCase({ accounts, sessions, identity: google, tokens, clock });
    current = new GetCurrentAccountUseCase(accounts, sessions, tokens, clock);
  });

  it('crea la cuenta con el correo en minúsculas y abre una sesión de 30 días', async () => {
    const issued = await signIn.execute(ctx);
    expect(issued.account.email).toBe('luz@ejemplo.com');
    expect(issued.expiresAt.getTime() - clock.now().getTime()).toBe(ACCOUNT_SECURITY.sessionTtlMs);
    const me = await current.execute({ sessionToken: issued.sessionToken });
    expect(me?.account.id).toBe(issued.account.id);
  });

  it('reutiliza la cuenta al volver a entrar', async () => {
    await signIn.execute(ctx);
    await signIn.execute(ctx);
    expect(accounts.items.size).toBe(1);
  });

  it('enlaza las compras si hay un solo cliente con ese correo', async () => {
    accounts.customersByEmail.set('luz@ejemplo.com', ['cus-1']);
    const issued = await signIn.execute(ctx);
    expect(issued.account.customerId).toBe('cus-1');
  });

  it('no enlaza si el correo es ambiguo', async () => {
    accounts.customersByEmail.set('luz@ejemplo.com', ['cus-1', 'cus-2']);
    const issued = await signIn.execute(ctx);
    expect(issued.account.customerId).toBeNull();
  });

  it('rechaza correos sin verificar y Google sin configurar', async () => {
    google.identity = { ...google.identity, emailVerified: false };
    await expectCode(signIn.execute(ctx), 'auth.unverified_email');
    google.configured = false;
    await expectCode(signIn.execute(ctx), 'account.google_disabled');
  });

  it('caduca la sesión y la renueva si se usa', async () => {
    const issued = await signIn.execute(ctx);
    clock.advance(ACCOUNT_SECURITY.renewAfterMs + 1000);
    const renewed = await current.execute({ sessionToken: issued.sessionToken });
    expect(renewed?.renewedUntil).not.toBeNull();
    clock.advance(ACCOUNT_SECURITY.sessionTtlMs + 1000);
    expect(await current.execute({ sessionToken: issued.sessionToken })).toBeNull();
    expect(sessions.items.size).toBe(0);
  });

  it('cierra sesión y exige sesión en `require`', async () => {
    const issued = await signIn.execute(ctx);
    await new SignOutAccountUseCase(sessions, tokens).execute({
      sessionToken: issued.sessionToken,
    });
    await expectCode(current.require({ sessionToken: issued.sessionToken }), 'auth.required');
  });
});

describe('Tu cielo guardado en la cuenta', () => {
  let sky: InMemorySky;
  let clock: FakeClock;

  beforeEach(() => {
    sky = new InMemorySky();
    clock = new FakeClock();
  });

  it('guarda y lee el perfil validado', async () => {
    const save = new SaveSkyProfileUseCase(sky, clock);
    await save.execute('acc-1', {
      birthDate: '1998-05-17',
      birthTime: '03:22',
      place: {
        name: 'Lima',
        region: 'Lima',
        country: 'Perú',
        lat: -12.05,
        lon: -77.04,
        timezone: 'America/Lima',
      },
    });
    const data = await new GetSkyDataUseCase(sky).execute('acc-1');
    expect(data.profile?.birthTime).toBe('03:22');
    expect(data.profile?.place?.timezone).toBe('America/Lima');
  });

  it('rechaza fechas, horas y lugares imposibles', async () => {
    const save = new SaveSkyProfileUseCase(sky, clock);
    await expectCode(save.execute('a', { birthDate: '2026-02-31' }), 'sky.invalid_date');
    await expectCode(save.execute('a', { birthDate: '2099-01-01' }), 'sky.invalid_date');
    await expectCode(
      save.execute('a', { birthDate: '1990-01-01', birthTime: '25:00' }),
      'sky.invalid_time',
    );
    await expectCode(
      save.execute('a', {
        birthDate: '1990-01-01',
        place: { name: 'X', lat: 200, lon: 0, timezone: 'America/Lima' },
      }),
      'sky.invalid_place',
    );
  });

  it('guarda preguntas sin repetir y conserva las 20 más recientes', async () => {
    const add = new AddSkyQuestionUseCase(sky, clock);
    for (let i = 0; i < 25; i++) {
      await add.execute('a', { question: `¿Pregunta ${i}?`, topic: 'love', day: '2026-10-04' });
    }
    await add.execute('a', { question: '¿Pregunta 24?', topic: 'love', day: '2026-10-04' });
    const data = await new GetSkyDataUseCase(sky).execute('a');
    expect(data.questions).toHaveLength(20);
    expect(data.questions[0]?.question).toBe('¿Pregunta 24?');
    await expectCode(
      add.execute('a', { question: 'x', topic: 'nope', day: '2026-10-04' }),
      'input.invalid',
    );
  });

  it('solo borra vínculos propios', async () => {
    const bond = await new AddSkyBondUseCase(sky, clock).execute('a', {
      name: 'Sol',
      birthDate: '1995-03-02',
    });
    const remove = new DeleteSkyBondUseCase(sky);
    await expectCode(remove.execute('otra', bond.id), 'sky.bond_not_found');
    await remove.execute('a', bond.id);
    expect(sky.bonds).toHaveLength(0);
  });
});
