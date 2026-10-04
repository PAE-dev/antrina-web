import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { type SecretCipher } from '@antrina/domain';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

/** Formato: `v1.<iv>.<authTag>.<ciphertext>` en base64url. */
export class AesGcmSecretCipher implements SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('La clave AES-256-GCM debe tener 32 bytes');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, encrypted]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, encrypted] = payload.split('.');
    if (version !== VERSION || !iv || !tag || !encrypted) {
      throw new Error('Secreto cifrado con formato desconocido');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
