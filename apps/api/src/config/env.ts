export interface S3Env {
  /** MinIO en local (`http://localhost:9000`), `https://<cuenta>.r2.cloudflarestorage.com` en R2. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Base pública de lectura (bucket público de MinIO o dominio de R2 / CDN). */
  publicUrl: string;
}

/** Cuentas de cliente: acceso con Google y cookie de sesión de todo el sitio. */
export interface AccountEnv {
  /** Vacíos = el botón "Continuar con Google" se oculta. */
  googleClientId: string;
  googleClientSecret: string;
  /** URL pública de esta API (para el redirect de Google): https://api.antrina.app */
  apiPublicUrl: string;
  /** Tienda (adonde se vuelve tras entrar): https://antrina.app */
  siteUrl: string;
  /** Dominio de la cookie para compartirla entre tienda y API (".antrina.app"); vacío = solo la API. */
  cookieDomain: string | null;
}

export interface AppEnv {
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  isProduction: boolean;
  /** Origen exacto del panel (`https://admin.antrina.app`); único con cookies y CORS con credenciales. */
  adminOrigin: string;
  /** 32 bytes para AES-256-GCM (semillas TOTP en reposo). */
  adminEncryptionKey: Buffer;
  s3: S3Env;
  account: AccountEnv;
}

export const APP_ENV = Symbol('APP_ENV');

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Falta ${name}. Copia .env.example a apps/api/.env`);
  return value;
}

/** En desarrollo se aceptan valores por defecto para MinIO local; en producción todo es obligatorio. */
function withDevDefault(
  source: NodeJS.ProcessEnv,
  name: string,
  devDefault: string,
  isProduction: boolean,
): string {
  const value = source[name]?.trim();
  if (value) return value;
  if (isProduction) throw new Error(`Falta ${name} en producción`);
  return devDefault;
}

function parseEncryptionKey(raw: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'ADMIN_ENCRYPTION_KEY debe ser 32 bytes en base64. Genera una con: openssl rand -base64 32',
    );
  }
  return key;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const isProduction = source.NODE_ENV === 'production';
  const s3Endpoint = withDevDefault(source, 'S3_ENDPOINT', 'http://localhost:9000', isProduction);
  const s3Bucket = withDevDefault(source, 'S3_BUCKET', 'antrina-media', isProduction);

  return {
    port: Number.parseInt(source.PORT ?? '3001', 10),
    databaseUrl: required(source, 'DATABASE_URL'),
    corsOrigins: (source.CORS_ORIGINS ?? 'http://localhost:4321')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    isProduction,
    adminOrigin: withDevDefault(source, 'ADMIN_ORIGIN', 'http://localhost:5174', isProduction),
    adminEncryptionKey: parseEncryptionKey(required(source, 'ADMIN_ENCRYPTION_KEY')),
    account: {
      googleClientId: source.GOOGLE_CLIENT_ID?.trim() ?? '',
      googleClientSecret: source.GOOGLE_CLIENT_SECRET?.trim() ?? '',
      apiPublicUrl: withDevDefault(
        source,
        'API_PUBLIC_URL',
        `http://localhost:${source.PORT ?? '3001'}`,
        isProduction,
      ).replace(/\/+$/, ''),
      siteUrl: withDevDefault(source, 'SITE_URL', 'http://localhost:4321', isProduction).replace(
        /\/+$/,
        '',
      ),
      cookieDomain: source.CUSTOMER_COOKIE_DOMAIN?.trim() || null,
    },
    s3: {
      endpoint: s3Endpoint,
      region: withDevDefault(source, 'S3_REGION', 'us-east-1', isProduction),
      bucket: s3Bucket,
      accessKeyId: withDevDefault(source, 'S3_ACCESS_KEY_ID', 'antrina', isProduction),
      secretAccessKey: withDevDefault(
        source,
        'S3_SECRET_ACCESS_KEY',
        'antrina-dev-secret',
        isProduction,
      ),
      publicUrl: withDevDefault(
        source,
        'S3_PUBLIC_URL',
        `${s3Endpoint}/${s3Bucket}`,
        isProduction,
      ).replace(/\/+$/, ''),
    },
  };
}
