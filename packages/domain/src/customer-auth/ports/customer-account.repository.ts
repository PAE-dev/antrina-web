import { type CustomerAccount, type CustomerProfile } from '../customer-account.js';
import { type GoogleIdentity } from './google-identity.provider.js';

export interface CustomerAccountRepository {
  findById(id: string): Promise<CustomerAccount | null>;
  findByGoogleSubject(subject: string): Promise<CustomerAccount | null>;
  createFromGoogle(identity: GoogleIdentity, now: Date): Promise<CustomerAccount>;
  /** Actualiza el correo y la fecha de acceso; el nombre puede haberse corregido en el panel. */
  recordGoogleLogin(id: string, identity: GoogleIdentity, now: Date): Promise<CustomerAccount>;
  updateProfile(id: string, profile: CustomerProfile): Promise<CustomerAccount>;
  setAvatar(id: string, avatarKey: string | null): Promise<CustomerAccount>;
}
