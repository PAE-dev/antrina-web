/**
 * Alta de administradores (no existe registro público).
 *
 *   pnpm admin:create --email taller@antrina.com --name "Taller" --role OWNER
 *
 * La contraseña se pide por consola sin eco (o se lee de ADMIN_PASSWORD en entornos automatizados).
 * En el primer login el panel obliga a configurar la app autenticadora.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { CreateAdminUserUseCase } from '@antrina/application';
import { ADMIN_ROLES, type AdminRole, DomainError } from '@antrina/domain';
import { PrismaPg } from '@prisma/adapter-pg';
import { Argon2PasswordHasher } from '../src/admin-auth/infrastructure/argon2-password.hasher.js';
import { PrismaAdminUserRepository } from '../src/admin-auth/infrastructure/prisma-admin.repositories.js';
import { type PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    let prompted = false;
    output._writeToOutput = (text: string) => {
      if (!prompted) {
        process.stdout.write(text);
        prompted = true;
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string', default: 'EDITOR' },
    },
  });
  if (!values.email || !values.name) {
    throw new Error(
      'Uso: pnpm admin:create --email <correo> --name <nombre> [--role OWNER|EDITOR]',
    );
  }
  const role = values.role?.toUpperCase() as AdminRole;
  if (!ADMIN_ROLES.includes(role)) throw new Error(`Rol inválido. Usa: ${ADMIN_ROLES.join(', ')}`);

  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await promptHidden('Contraseña (mín. 12 caracteres): ');
    const confirmation = await promptHidden('Repite la contraseña: ');
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const useCase = new CreateAdminUserUseCase(
      new PrismaAdminUserRepository(prisma as unknown as PrismaService),
      new Argon2PasswordHasher(),
    );
    const admin = await useCase.execute({ email: values.email, name: values.name, password, role });
    console.log(
      `Administrador creado: ${admin.email} (${admin.role}). Configura el 2FA en el primer login.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof DomainError || error instanceof Error ? error.message : error);
  process.exit(1);
});
