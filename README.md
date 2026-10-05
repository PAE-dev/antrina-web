# Antrina

Tienda de árboles bonsái de cuarzo hechos a mano en nuestro taller familiar de Lima.
_Arraigado en tu intención._

Monorepo con **Astro 7 + HeroUI v3** (storefront), **Vite + React + HeroUI v3** (panel de
administración) y **NestJS 12 + Prisma 7 + PostgreSQL** (API), organizado con arquitectura hexagonal.
El sistema de diseño "Galería mineral" (paleta piedra/carbón con amatista, tipografía Bricolage
Grotesque + Geist + Geist Mono, layout) vive en `packages/ui/src/styles/tokens.css`, lo comparten la
tienda y el panel, y está documentado en
[AGENTS.md](AGENTS.md#sistema-de-diseño-obligatorio-galería-mineral).

## Requisitos

- Node 22 (`nvm use`) y pnpm 10 (`corepack enable`)
- Docker (Postgres y MinIO locales)

## Arranque rápido

```bash
pnpm install
cp .env.example apps/api/.env      # y rellena ADMIN_ENCRYPTION_KEY: openssl rand -base64 32
cp .env.example apps/web/.env
cp .env.example apps/admin/.env
pnpm services:up                   # Postgres :5433 + MinIO :9000 (consola :9001) + bucket público
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:4321 (español) y http://localhost:4321/en/
- Panel: http://localhost:5174
- API: http://localhost:3001/catalog/products?featured=true&locale=es

Si la API no está levantada, la landing muestra productos de ejemplo (fallback).

## Panel de administración

El panel es una app aparte (`apps/admin`) que en producción vive en `admin.antrina.com`, no
indexable y sin enlaces desde la tienda. No hay registro público: los administradores se crean por
consola.

```bash
pnpm admin:create --email taller@antrina.com --name "Taller Antrina" --role OWNER
```

1. Entra en http://localhost:5174 con ese correo y contraseña (mínimo 12 caracteres).
2. La primera vez se pide vincular una app autenticadora (Google Authenticator, 1Password, Authy…)
   escaneando el QR. A partir de ahí cada acceso pide contraseña + código de 6 dígitos.
3. En **Productos** se crean y editan productos (español obligatorio, inglés opcional), precio en
   soles, stock, estado (borrador / publicado / archivado), intención, etiqueta y destacado.
4. Al editar un producto se suben las fotos: se optimizan en el navegador (WebP, máx. 2400 px), se
   suben directo al almacenamiento con una URL firmada y se ordenan arrastrando; la primera es la
   portada en la tienda. Cada foto lleva texto alternativo en es/en.

Seguridad: Argon2id, 2FA TOTP obligatorio, cookie de sesión httpOnly + SameSite=Strict, bloqueo de
15 min tras 5 intentos fallidos, rate limiting, comprobación de `Origin` y registro de auditoría de
cada cambio (`AuditLog`). Detalle en [AGENTS.md](AGENTS.md#seguridad-del-panel).

### Fotos en producción (Cloudflare R2)

El mismo código usa MinIO en local y R2 en producción; solo cambian las variables `S3_*`
(ver `.env.example`). En R2: crea el bucket, un token de API con permiso de lectura/escritura sobre
él, conecta un dominio público (p. ej. `media.antrina.com`) y configura CORS permitiendo `PUT` desde
`https://admin.antrina.com` con las cabeceras `Content-Type` y `Cache-Control`.

## Estructura

```
apps/
  web/        Astro storefront (i18n es/en)
  admin/      Panel de administración (Vite + React + HeroUI)
  api/        NestJS: catalog, checkout, notification, admin-auth, admin-catalog
packages/
  domain/       entidades, value objects y puertos
  application/  casos de uso (+ tests Vitest)
  contracts/    DTOs compartidos
  ui/           componentes React + HeroUI y tokens de diseño
  config/       tsconfig, eslint, prettier
```

Convenciones, fronteras entre capas y recetas para extender: ver [AGENTS.md](AGENTS.md).

## Roadmap

1. **Fase 1:** monorepo, catálogo de solo lectura, home con identidad de marca.
2. **Panel admin (actual):** acceso con 2FA, productos, stock y fotos.
3. Páginas de intención, signo, tamaño y producto; "Crea tu árbol" (configurador).
4. Carrito y checkout con pasarela peruana (Culqi / Niubiz / Yape).
5. Notificación de pedidos por WhatsApp Cloud API.
6. Panel admin: pedidos, promociones (sin descuentos visibles en home ni catálogo) y gestión de
   administradores.
7. Multi-país: monedas, impuestos y envíos por país.
