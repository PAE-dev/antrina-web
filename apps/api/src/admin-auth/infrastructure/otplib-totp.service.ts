import { Injectable } from '@nestjs/common';
import { type TotpEnrollment, type TotpService } from '@antrina/domain';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = 'Antrina Admin';

@Injectable()
export class OtplibTotpService implements TotpService {
  generateSecret(): string {
    return generateSecret();
  }

  async buildEnrollment(secret: string, accountName: string): Promise<TotpEnrollment> {
    const otpauthUri = generateURI({ issuer: ISSUER, label: accountName, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
    return { otpauthUri, qrDataUrl };
  }

  async verify(code: string, secret: string): Promise<boolean> {
    try {
      // ±30 s para tolerar relojes de móvil ligeramente desfasados.
      const result = await verify({ secret, token: code, epochTolerance: 30 });
      return result.valid;
    } catch {
      return false;
    }
  }
}
