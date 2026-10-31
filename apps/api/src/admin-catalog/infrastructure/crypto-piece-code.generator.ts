import { randomInt } from 'node:crypto';
import { type PieceCodeGenerator } from '@antrina/domain';

/** Sin 0/o, 1/l/i ni u: el código también se puede leer y escribir a mano desde la etiqueta. */
const ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789';
/** 30^10 combinaciones: unos 49 bits, imposible de recorrer probando URLs. */
const LENGTH = 10;

export class CryptoPieceCodeGenerator implements PieceCodeGenerator {
  generate(): string {
    return Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  }
}
