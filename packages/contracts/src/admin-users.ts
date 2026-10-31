import { type AdminRoleCode } from './admin-auth.js';

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: AdminRoleCode;
  isActive: boolean;
  hasTotp: boolean;
  /** Si está en el futuro, la cuenta está bloqueada por intentos fallidos. */
  lockedUntil: string | null;
  lastLoginAt: string | null;
}

export interface AdminUserListResponse {
  data: AdminUserDto[];
}

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  password: string;
  role: AdminRoleCode;
}

export interface UpdateAdminUserRequest {
  email: string;
  name: string;
  role: AdminRoleCode;
  isActive: boolean;
}

export interface ResetAdminPasswordRequest {
  password: string;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const ADMIN_USERS_ROUTES = {
  users: '/admin/users',
  user: (id: string) => `/admin/users/${id}`,
  password: (id: string) => `/admin/users/${id}/password`,
  ownPassword: '/admin/account/password',
} as const;
