# Antrina

Tienda de árboles de cuarzo y otras piezas hechas a mano en nuestro taller familiar de Lima.
_Arraigado en tu intención._

Monorepo con **Astro 7 + HeroUI v3** (storefront), **Vite + React + HeroUI v3** (panel de
administración) y **NestJS 12 + Prisma 7 + PostgreSQL** (API), organizado con arquitectura hexagonal.
El sistema de diseño "Marino" (azul marino, hueso y terracota, tipografía Fraunces + DM Sans, rombo
de marca) vive en `packages/ui/src/styles/tokens.css` y lo comparten la tienda y el panel.

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

Producción (Supabase): antes de publicar una versión con migraciones nuevas, aplícalas con
`DATABASE_URL=<url directa> pnpm --filter @antrina/api db:deploy`. Vercel no lo hace solo.

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

1. Entra en http://localhost:5174 con ese correo y contraseña. El 2FA es opcional.
2. **Resumen:** ventas de hoy y del mes, ingresos de 30 días, más vendidos y stock por reponer.
3. **Ventas:** registra una venta (productos, cliente, canal, pago, envío y descuento). El stock se
   descuenta solo y, si la cancelas, vuelve. Estados: pendiente, pagada, enviada y entregada.
4. **Productos:** categoría y subcategoría, precio normal, precio de oferta, costo (solo interno),
   stock inicial, alerta de stock, estado y etiqueta. Español obligatorio, inglés opcional.
5. **Inventario:** entradas, salidas y conteos por cantidad, con historial de cada movimiento.
6. **Categorías:** categorías con un nivel de subcategoría. Las que tienen productos publicados
   aparecen en la tienda (`/categoria/<slug>`).
7. **Clientes y WhatsApp:** los clientes se crean al vender con su teléfono. La vista de WhatsApp
   abre el chat con mensajes listos; recibir mensajes en el panel llegará con la API de WhatsApp.
8. Al editar un producto se suben las fotos: se optimizan en el navegador (WebP, máx. 2400 px), se
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
  api/        NestJS: catalog, checkout, notification, admin-auth, admin-catalog, admin-sales
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
2. **Panel admin (actual):** resumen, ventas, inventario, categorías, clientes y fotos.
3. Páginas de intención, signo, tamaño y producto; "Crea tu árbol" (configurador).
4. Carrito y checkout con pasarela peruana (Culqi / Niubiz / Yape).
5. WhatsApp Cloud API: conectar el número y recibir mensajes en el panel.
6. Panel admin: promociones y gestión de administradores.
7. Multi-país: monedas, impuestos y envíos por país.
