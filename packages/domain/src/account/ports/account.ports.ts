import { type CustomerAccount, type CustomerSession, type VerifiedIdentity } from '../account.js';
import { type SkyBond, type SkyProfile, type SkyQuestion, type SkyTopic } from '../sky-profile.js';

export interface NewCustomerAccount {
  email: string;
  name: string;
  avatarUrl: string | null;
  googleSub: string;
  customerId: string | null;
}

export interface CustomerAccountRepository {
  findById(id: string): Promise<CustomerAccount | null>;
  findByGoogleSub(sub: string): Promise<CustomerAccount | null>;
  findByEmail(email: string): Promise<CustomerAccount | null>;
  create(input: NewCustomerAccount): Promise<CustomerAccount>;
  /** Actualiza los datos que vienen de Google y el último acceso. */
  updateProfile(
    id: string,
    input: { email: string; name: string; avatarUrl: string | null; googleSub: string },
    now: Date,
  ): Promise<CustomerAccount>;
  linkCustomer(id: string, customerId: string): Promise<void>;
  /**
   * Cliente de ventas con ese correo (sin distinguir mayúsculas), solo si hay exactamente uno y
   * no está enlazado a otra cuenta.
   */
  findLinkableCustomerId(email: string): Promise<string | null>;
}

export interface NewCustomerSession {
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}

export interface CustomerSessionStore {
  create(input: NewCustomerSession): Promise<CustomerSession>;
  findByTokenHash(tokenHash: string): Promise<CustomerSession | null>;
  /** Marca actividad y, si se indica, extiende la caducidad. */
  touch(id: string, now: Date, expiresAt?: Date): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Intercambia el código de autorización (OAuth 2.0 + PKCE) por la identidad verificada. */
export interface IdentityProvider {
  isConfigured(): boolean;
  authorizationUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string;
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<VerifiedIdentity>;
}

export interface SkyProfileInput {
  birthDate: string;
  birthTime: string | null;
  place: SkyProfile['place'];
}

export interface SkyRepository {
  getProfile(accountId: string): Promise<SkyProfile | null>;
  saveProfile(accountId: string, input: SkyProfileInput): Promise<SkyProfile>;
  /** Borra perfil, preguntas y vínculos. */
  deleteAll(accountId: string): Promise<void>;
  listQuestions(accountId: string, limit: number): Promise<SkyQuestion[]>;
  /** Guarda la pregunta (reemplaza una igual) y conserva solo las `keep` más recientes. */
  addQuestion(
    accountId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ): Promise<SkyQuestion>;
  listBonds(accountId: string): Promise<SkyBond[]>;
  countBonds(accountId: string): Promise<number>;
  addBond(accountId: string, input: { name: string; birthDate: string }): Promise<SkyBond>;
  /** Devuelve false si el vínculo no existe o es de otra cuenta. */
  deleteBond(accountId: string, bondId: string): Promise<boolean>;
}
