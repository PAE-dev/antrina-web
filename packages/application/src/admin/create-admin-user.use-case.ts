import {
  ADMIN_ROLES,
  ADMIN_SECURITY,
  type AdminRole,
  type AdminUser,
  type AdminUserRepository,
  DomainError,
  normalizeEmail,
  type PasswordHasher,
} from '@antrina/domain';

export interface CreateAdminUserInput {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAdminEmail(value: string): string {
  const email = normalizeEmail(value);
  if (!EMAIL_PATTERN.test(email)) throw new DomainError('Correo inválido', 'admin.invalid_email');
  return email;
}

export function parseAdminName(value: string): string {
  const name = value.trim();
  if (name.length === 0 || name.length > 80) {
    throw new DomainError('El nombre es obligatorio (máx. 80)', 'admin.invalid_name');
  }
  return name;
}

export function parseAdminRole(value: string): AdminRole {
  if (!(ADMIN_ROLES as readonly string[]).includes(value)) {
    throw new DomainError('Rol inválido', 'admin.invalid_role');
  }
  return value as AdminRole;
}

export function assertValidPassword(password: string): void {
  if (password.length < ADMIN_SECURITY.minPasswordLength) {
    throw new DomainError(
      `La contraseña debe tener al menos ${ADMIN_SECURITY.minPasswordLength} caracteres`,
      'admin.weak_password',
    );
  }
  if (password.length > ADMIN_SECURITY.maxPasswordLength) {
    throw new DomainError(
      `La contraseña puede tener hasta ${ADMIN_SECURITY.maxPasswordLength} caracteres`,
      'admin.weak_password',
    );
  }
}

/** Alta de administradores (`pnpm admin:create` o panel); no hay registro público. */
export class CreateAdminUserUseCase {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: CreateAdminUserInput): Promise<AdminUser> {
    const email = parseAdminEmail(input.email);
    const name = parseAdminName(input.name);
    assertValidPassword(input.password);
    parseAdminRole(input.role);
    if (await this.users.findByEmail(email)) {
      throw new DomainError('Ya existe un administrador con ese correo', 'admin.duplicate_email');
    }
    const passwordHash = await this.hasher.hash(input.password);
    return this.users.create({ email, name, passwordHash, role: input.role });
  }
}
