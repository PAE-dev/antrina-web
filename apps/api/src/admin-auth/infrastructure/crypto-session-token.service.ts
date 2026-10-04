import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type Clock, type SessionTokenService } from '@antrina/domain';

@Injectable()
export class CryptoSessionTokenService implements SessionTokenService {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
