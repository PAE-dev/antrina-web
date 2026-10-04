export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface TotpEnrollment {
  otpauthUri: string;
  /** QR listo para `<img src>`. */
  qrDataUrl: string;
}

export interface TotpService {
  generateSecret(): string;
  buildEnrollment(secret: string, accountName: string): Promise<TotpEnrollment>;
  verify(code: string, secret: string): Promise<boolean>;
}

/** Cifrado simétrico para secretos en reposo (p. ej. semillas TOTP). */
export interface SecretCipher {
  encrypt(plain: string): string;
  decrypt(encrypted: string): string;
}

/** Tokens opacos de sesión: solo el hash se persiste. */
export interface SessionTokenService {
  generate(): { token: string; tokenHash: string };
  hash(token: string): string;
}

export interface Clock {
  now(): Date;
}
