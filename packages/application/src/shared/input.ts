import { DomainError } from '@antrina/domain';

/** Validación defensiva de entradas HTTP: los tipos de contracts no se cumplen en tiempo de ejecución. */
export function requireString(value: unknown, field: string, maxLength = 4000): string {
  if (typeof value !== 'string') {
    throw new DomainError(`El campo "${field}" es obligatorio`, 'input.invalid');
  }
  if (value.length > maxLength) {
    throw new DomainError(`El campo "${field}" es demasiado largo`, 'input.invalid');
  }
  return value;
}

export function optionalString(value: unknown, field: string, maxLength = 4000): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireString(value, field, maxLength);
}

export function requireInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new DomainError(`El campo "${field}" debe ser un número entero`, 'input.invalid');
  }
  return value;
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new DomainError(`El campo "${field}" debe ser verdadero o falso`, 'input.invalid');
  }
  return value;
}

export function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new DomainError(`Valor inválido para "${field}"`, 'input.invalid');
  }
  return value as T;
}

export function notFound(entity: string, code: string): DomainError {
  return new DomainError(`${entity} no encontrado`, code);
}
