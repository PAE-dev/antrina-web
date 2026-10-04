import { Injectable } from '@nestjs/common';
import { type PasswordHasher } from '@antrina/domain';
import { hash, verify } from '@node-rs/argon2';

/** Argon2id con los parámetros mínimos recomendados por OWASP (19 MiB, 2 iteraciones). */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
