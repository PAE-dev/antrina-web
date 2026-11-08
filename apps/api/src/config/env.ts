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

export interface AppEnv {
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  isProduction: boolean;
  /** Origen exacto del panel (`https://admin.antrina.app`); único con cookies y CORS con credenciales. */
  adminOrigin: string;
  /** 32 bytes para AES-256-GCM (semillas TOTP en reposo). */
  adminEncryptionKey: Buffer;
  /** Origen público de la tienda (`https://antrina.app`): vuelta de Google y mutaciones de la cuenta. */
  storeOrigin: string;
  /** Sin credenciales la API arranca igual y la tienda avisa de que el acceso no está disponible. */
  google: GoogleEnv | null;
  s3: S3Env;
}

export interface GoogleEnv {
  clientId: string;
  clientSecret: string;
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

function loadGoogleEnv(source: NodeJS.ProcessEnv): GoogleEnv | null {
  const clientId = source.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = source.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
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
    storeOrigin: (source.STORE_ORIGIN?.trim() || 'http://localhost:4321').replace(/\/+$/, ''),
    google: loadGoogleEnv(source),
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
