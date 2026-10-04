import { ADMIN_SECURITY, type DomainError } from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConfirmTotpEnrollmentUseCase,
  CreateAdminUserUseCase,
  GetCurrentAdminUseCase,
  LoginUseCase,
  LogoutUseCase,
  StartTotpEnrollmentUseCase,
  VerifyTotpUseCase,
} from '../src/index.js';
import { createAuthDeps } from './fakes.js';

const EMAIL = 'taller@antrina.com';
const PASSWORD = 'cuarzo-rosa-2026';
const ctx = { ip: '127.0.0.1', userAgent: 'vitest' };

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

describe('autenticación del panel', () => {
  let env: ReturnType<typeof createAuthDeps>;
  let login: LoginUseCase;
  let verify: VerifyTotpUseCase;
  let startEnrollment: StartTotpEnrollmentUseCase;
  let confirmEnrollment: ConfirmTotpEnrollmentUseCase;
  let currentAdmin: GetCurrentAdminUseCase;

  beforeEach(async () => {
    env = createAuthDeps();
    const { deps } = env;
    login = new LoginUseCase(deps);
    verify = new VerifyTotpUseCase(deps);
    startEnrollment = new StartTotpEnrollmentUseCase(deps);
    confirmEnrollment = new ConfirmTotpEnrollmentUseCase(deps);
    currentAdmin = new GetCurrentAdminUseCase(deps.users, deps.sessions, deps.tokens, deps.clock);
    await new CreateAdminUserUseCase(deps.users, deps.hasher).execute({
      email: EMAIL,
      name: 'Taller',
      password: PASSWORD,
      role: 'OWNER',
    });
  });

  async function enrollTotp(): Promise<string> {
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    await startEnrollment.execute({ sessionToken: pending.sessionToken });
    const session = await confirmEnrollment.execute({
      sessionToken: pending.sessionToken,
      code: '123456',
      ...ctx,
    });
    return session.sessionToken;
  }

  it('rechaza credenciales inválidas sin revelar si el correo existe', async () => {
    await expectCode(
      login.execute({ email: 'nadie@antrina.com', password: PASSWORD, ...ctx }),
      'auth.invalid_credentials',
    );
    await expectCode(
      login.execute({ email: EMAIL, password: 'incorrecta-123', ...ctx }),
      'auth.invalid_credentials',
    );
  });

  it('el primer login exige configurar el 2FA y no da acceso al panel', async () => {
    const result = await login.execute({
      email: ` ${EMAIL.toUpperCase()} `,
      password: PASSWORD,
      ...ctx,
    });
    expect(result.status).toBe('MFA_SETUP_REQUIRED');
    await expectCode(
      currentAdmin.execute({ sessionToken: result.sessionToken }),
      'auth.unauthorized',
    );
  });

  it('configura el 2FA, rota el token y concede la sesión completa', async () => {
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    const setup = await startEnrollment.execute({ sessionToken: pending.sessionToken });
    expect(setup.secret).toBe('SECRET');
    expect(setup.otpauthUri).toContain(EMAIL);

    const user = await env.users.findByEmail(EMAIL);
    expect(user?.totpSecretEnc).toBe('enc:SECRET');

    await expectCode(
      confirmEnrollment.execute({ sessionToken: pending.sessionToken, code: '000000', ...ctx }),
      'auth.mfa_invalid',
    );

    const session = await confirmEnrollment.execute({
      sessionToken: pending.sessionToken,
      code: '123 456',
      ...ctx,
    });
    expect(session.sessionToken).not.toBe(pending.sessionToken);
    await expectCode(
      currentAdmin.execute({ sessionToken: pending.sessionToken }),
      'auth.unauthorized',
    );

    const me = await currentAdmin.execute({ sessionToken: session.sessionToken });
    expect(me).toMatchObject({ email: EMAIL, role: 'OWNER' });
    expect(me.permissions).toContain('admins.manage');
    expect(env.audit.entries.map((entry) => entry.action)).toEqual([
      'auth.mfa_enabled',
      'auth.login',
    ]);
  });

  it('con 2FA activo pide el código y lo verifica', async () => {
    await enrollTotp();
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    expect(pending.status).toBe('MFA_REQUIRED');
    await expectCode(
      startEnrollment.execute({ sessionToken: pending.sessionToken }),
      'auth.mfa_already_enabled',
    );
    await expectCode(
      verify.execute({ sessionToken: pending.sessionToken, code: '999999', ...ctx }),
      'auth.mfa_invalid',
    );
    const session = await verify.execute({
      sessionToken: pending.sessionToken,
      code: '123456',
      ...ctx,
    });
    await expect(
      currentAdmin.execute({ sessionToken: session.sessionToken }),
    ).resolves.toMatchObject({
      email: EMAIL,
    });
    expect((await env.users.findByEmail(EMAIL))?.failedLogins).toBe(0);
  });

  it('bloquea la cuenta 15 minutos tras 5 contraseñas incorrectas', async () => {
    for (let attempt = 1; attempt < ADMIN_SECURITY.maxFailedLogins; attempt++) {
      await expectCode(
        login.execute({ email: EMAIL, password: 'incorrecta-123', ...ctx }),
        'auth.invalid_credentials',
      );
    }
    await expectCode(
      login.execute({ email: EMAIL, password: 'incorrecta-123', ...ctx }),
      'auth.locked',
    );
    // Ni con la contraseña correcta mientras dure el bloqueo.
    await expectCode(login.execute({ email: EMAIL, password: PASSWORD, ...ctx }), 'auth.locked');
    expect(env.audit.entries.some((entry) => entry.action === 'auth.locked')).toBe(true);

    env.clock.advance(ADMIN_SECURITY.lockoutMs + 1000);
    await expect(
      login.execute({ email: EMAIL, password: PASSWORD, ...ctx }),
    ).resolves.toMatchObject({
      status: 'MFA_SETUP_REQUIRED',
    });
  });

  it('los códigos 2FA incorrectos también cuentan para el bloqueo y cierran la sesión pendiente', async () => {
    await enrollTotp();
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    for (let attempt = 1; attempt < ADMIN_SECURITY.maxFailedLogins; attempt++) {
      await expectCode(
        verify.execute({ sessionToken: pending.sessionToken, code: '000000', ...ctx }),
        'auth.mfa_invalid',
      );
    }
    await expectCode(
      verify.execute({ sessionToken: pending.sessionToken, code: '000000', ...ctx }),
      'auth.locked',
    );
    await expectCode(
      verify.execute({ sessionToken: pending.sessionToken, code: '123456', ...ctx }),
      'auth.unauthorized',
    );
  });

  it('la sesión pendiente caduca a los 10 minutos', async () => {
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    env.clock.advance(ADMIN_SECURITY.pendingSessionTtlMs + 1);
    await expectCode(
      startEnrollment.execute({ sessionToken: pending.sessionToken }),
      'auth.unauthorized',
    );
  });

  it('la sesión completa expira por inactividad y se puede cerrar', async () => {
    const token = await enrollTotp();
    env.clock.advance(ADMIN_SECURITY.idleTimeoutMs - 1000);
    await currentAdmin.execute({ sessionToken: token });
    env.clock.advance(ADMIN_SECURITY.idleTimeoutMs - 1000);
    await currentAdmin.execute({ sessionToken: token });

    await new LogoutUseCase(env.deps.sessions, env.deps.tokens).execute({ sessionToken: token });
    await expectCode(currentAdmin.execute({ sessionToken: token }), 'auth.unauthorized');

    const another = await enrollTotpAgain();
    env.clock.advance(ADMIN_SECURITY.idleTimeoutMs + 1);
    await expectCode(currentAdmin.execute({ sessionToken: another }), 'auth.unauthorized');
  });

  async function enrollTotpAgain(): Promise<string> {
    const pending = await login.execute({ email: EMAIL, password: PASSWORD, ...ctx });
    const session = await verify.execute({
      sessionToken: pending.sessionToken,
      code: '123456',
      ...ctx,
    });
    return session.sessionToken;
  }

  it('el alta por CLI exige contraseña larga y correo único', async () => {
    const create = new CreateAdminUserUseCase(env.deps.users, env.deps.hasher);
    await expectCode(
      create.execute({
        email: 'otro@antrina.com',
        name: 'Otro',
        password: 'corta',
        role: 'EDITOR',
      }),
      'admin.weak_password',
    );
    await expectCode(
      create.execute({ email: EMAIL, name: 'Otro', password: PASSWORD, role: 'EDITOR' }),
      'admin.duplicate_email',
    );
  });
});
