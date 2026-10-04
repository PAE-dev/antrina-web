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

/** Alta de administradores desde la CLI (`pnpm admin:create`); no hay registro público. */
export class CreateAdminUserUseCase {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: CreateAdminUserInput): Promise<AdminUser> {
    const email = normalizeEmail(input.email);
    if (!EMAIL_PATTERN.test(email)) throw new DomainError('Correo inválido', 'admin.invalid_email');
    const name = input.name.trim();
    if (name.length === 0 || name.length > 80) {
      throw new DomainError('El nombre es obligatorio (máx. 80)', 'admin.invalid_name');
    }
    if (input.password.length < ADMIN_SECURITY.minPasswordLength) {
      throw new DomainError(
        `La contraseña debe tener al menos ${ADMIN_SECURITY.minPasswordLength} caracteres`,
        'admin.weak_password',
      );
    }
    if (!(ADMIN_ROLES as readonly string[]).includes(input.role)) {
      throw new DomainError('Rol inválido', 'admin.invalid_role');
    }
    if (await this.users.findByEmail(email)) {
      throw new DomainError('Ya existe un administrador con ese correo', 'admin.duplicate_email');
    }
    const passwordHash = await this.hasher.hash(input.password);
    return this.users.create({ email, name, passwordHash, role: input.role });
  }
}
