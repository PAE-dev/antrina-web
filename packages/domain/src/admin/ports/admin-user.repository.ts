import { type AdminRole, type AdminUser } from '../admin-user.js';

export interface NewAdminUser {
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
  findById(id: string): Promise<AdminUser | null>;
  create(input: NewAdminUser): Promise<AdminUser>;
  save(user: AdminUser): Promise<void>;
}
