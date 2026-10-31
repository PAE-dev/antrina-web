import { ADMIN_SECURITY, type DomainError } from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ChangeOwnPasswordUseCase,
  CreateAdminUserUseCase,
  CreateManagedAdminUserUseCase,
  ListAdminUsersUseCase,
  ResetAdminPasswordUseCase,
  UpdateAdminUserUseCase,
} from '../src/index.js';
import { createAuthDeps } from './fakes.js';

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

describe('usuarios del panel', () => {
  let env: ReturnType<typeof createAuthDeps>;
  let ownerId: string;
  let editorId: string;
  let create: CreateManagedAdminUserUseCase;
  let update: UpdateAdminUserUseCase;
  let reset: ResetAdminPasswordUseCase;
  let change: ChangeOwnPasswordUseCase;

  async function openSession(adminUserId: string): Promise<string> {
    const { tokenHash } = env.deps.tokens.generate();
    const session = await env.deps.sessions.create({
      adminUserId,
      tokenHash,
      mfaVerified: true,
      expiresAt: new Date(env.clock.now().getTime() + ADMIN_SECURITY.sessionTtlMs),
      ip: null,
      userAgent: null,
    });
    return session.id;
  }

  const profile = (overrides: object = {}) => ({
    email: 'ventas@antrina.com',
    name: 'Ventas',
    role: 'EDITOR' as const,
    isActive: true,
    ...overrides,
  });

  beforeEach(async () => {
    env = createAuthDeps();
    const { deps } = env;
    const createUser = new CreateAdminUserUseCase(deps.users, deps.hasher);
    create = new CreateManagedAdminUserUseCase(createUser, deps.audit);
    update = new UpdateAdminUserUseCase(deps.users, deps.sessions, deps.audit);
    reset = new ResetAdminPasswordUseCase(deps.users, deps.sessions, deps.hasher, deps.audit);
    change = new ChangeOwnPasswordUseCase(deps);
    ownerId = (
      await createUser.execute({
        email: 'taller@antrina.com',
        name: 'Taller',
        password: 'clave-dueno',
        role: 'OWNER',
      })
    ).id;
    editorId = (
      await createUser.execute({
        email: 'ventas@antrina.com',
        name: 'Ventas',
        password: 'clave-ventas',
        role: 'EDITOR',
      })
    ).id;
  });

  it('crea usuarios sin exponer la contraseña y deja rastro sin ella', async () => {
    const created = await create.execute(
      { email: ' NUEVO@antrina.com ', name: ' Nuevo ', password: 'secreta', role: 'EDITOR' },
      ownerId,
    );
    expect(created).toMatchObject({ email: 'nuevo@antrina.com', name: 'Nuevo', role: 'EDITOR' });
    expect(JSON.stringify(created)).not.toContain('secreta');
    expect(JSON.stringify(env.audit.entries)).not.toContain('secreta');
    expect(env.audit.entries.at(-1)?.action).toBe('admin_user.created');
    const listed = await new ListAdminUsersUseCase(env.deps.users).execute();
    expect(listed.data).toHaveLength(3);
  });

  it('rechaza correos repetidos y datos inválidos', async () => {
    await expectCode(
      create.execute(
        { email: 'VENTAS@antrina.com', name: 'Otro', password: 'x', role: 'EDITOR' },
        ownerId,
      ),
      'admin.duplicate_email',
    );
    await expectCode(
      create.execute(
        { email: 'nuevo@antrina.com', name: 'Otro', password: 'x', role: 'ADMIN' as 'EDITOR' },
        ownerId,
      ),
      'input.invalid',
    );
    await expectCode(
      update.execute(editorId, profile({ email: 'taller@antrina.com' }), ownerId),
      'admin.duplicate_email',
    );
    await expectCode(update.execute('nadie', profile(), ownerId), 'admin.not_found');
  });

  it('nunca deja el panel sin un propietario activo', async () => {
    await expectCode(
      update.execute(ownerId, profile({ email: 'taller@antrina.com', role: 'EDITOR' }), ownerId),
      'admin.last_owner',
    );
    await expectCode(
      update.execute(
        ownerId,
        profile({ email: 'taller@antrina.com', role: 'OWNER', isActive: false }),
        ownerId,
      ),
      'admin.self_deactivation',
    );
    await update.execute(editorId, profile({ role: 'OWNER' }), ownerId);
    const demoted = await update.execute(
      ownerId,
      profile({ email: 'taller@antrina.com', role: 'EDITOR' }),
      ownerId,
    );
    expect(demoted.role).toBe('EDITOR');
  });

  it('desactivar a alguien cierra sus sesiones', async () => {
    await openSession(editorId);
    await update.execute(editorId, profile({ isActive: false }), ownerId);
    expect(env.sessions.sessions.size).toBe(0);
    expect(env.audit.entries.at(-1)?.changes).toEqual({ isActive: { from: true, to: false } });
  });

  it('un propietario asigna contraseña, levanta el bloqueo y cierra sesiones', async () => {
    const user = await env.users.findById(editorId);
    if (!user) throw new Error('usuario de prueba ausente');
    let locked = user;
    for (let attempt = 0; attempt < ADMIN_SECURITY.maxFailedLogins; attempt++) {
      locked = locked.withFailedAttempt(env.clock.now());
    }
    await env.users.save(locked);
    await openSession(editorId);

    const result = await reset.execute(editorId, { password: 'clave-nueva' }, ownerId);

    expect(result.lockedUntil).toBeNull();
    expect((await env.users.findById(editorId))?.passwordHash).toBe('hashed:clave-nueva');
    expect(env.sessions.sessions.size).toBe(0);
    expect(JSON.stringify(env.audit.entries)).not.toContain('clave-nueva');
    await expectCode(reset.execute(ownerId, { password: 'x' }, ownerId), 'admin.use_own_password');
  });

  it('cambiar la propia contraseña exige la actual y conserva solo esta sesión', async () => {
    const sessionId = await openSession(ownerId);
    const other = await openSession(ownerId);

    await expectCode(
      change.execute({ currentPassword: 'mal', newPassword: 'nueva' }, { id: ownerId, sessionId }),
      'admin.wrong_password',
    );
    expect((await env.users.findById(ownerId))?.failedLogins).toBe(1);

    await change.execute(
      { currentPassword: 'clave-dueno', newPassword: 'nueva' },
      { id: ownerId, sessionId },
    );
    expect((await env.users.findById(ownerId))?.passwordHash).toBe('hashed:nueva');
    expect(env.sessions.sessions.has(sessionId)).toBe(true);
    expect(env.sessions.sessions.has(other)).toBe(false);
  });

  it('muchos intentos con la contraseña actual incorrecta bloquean la cuenta', async () => {
    const sessionId = await openSession(ownerId);
    const wrong = { currentPassword: 'mal', newPassword: 'nueva' };
    for (let attempt = 1; attempt < ADMIN_SECURITY.maxFailedLogins; attempt++) {
      await expectCode(change.execute(wrong, { id: ownerId, sessionId }), 'admin.wrong_password');
    }
    await expectCode(change.execute(wrong, { id: ownerId, sessionId }), 'auth.locked');
  });
});
