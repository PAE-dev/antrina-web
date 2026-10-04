export type AdminRoleCode = 'OWNER' | 'EDITOR';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

/** Tras la contraseña siempre falta un paso: verificar el código o configurar la app autenticadora. */
export type AdminLoginStatus = 'MFA_REQUIRED' | 'MFA_SETUP_REQUIRED';

export interface AdminLoginResponse {
  status: AdminLoginStatus;
}

export interface AdminTotpCodeRequest {
  code: string;
}

export interface AdminTotpSetupDto {
  otpauthUri: string;
  qrDataUrl: string;
  /** Para escribirlo a mano si no se puede escanear el QR. */
  secret: string;
}

export interface AdminMeDto {
  id: string;
  email: string;
  name: string;
  role: AdminRoleCode;
}

export interface ApiErrorDto {
  statusCode: number;
  code: string;
  message: string;
}

export const ADMIN_AUTH_ROUTES = {
  login: '/admin/auth/login',
  verifyMfa: '/admin/auth/mfa/verify',
  setupMfa: '/admin/auth/mfa/setup',
  confirmMfa: '/admin/auth/mfa/confirm',
  logout: '/admin/auth/logout',
  me: '/admin/auth/me',
} as const;
