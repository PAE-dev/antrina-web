# AGENTS.md — Antrina

E-commerce de árboles bonsái de cuarzo hechos a mano en un taller familiar de Lima, con venta
multi-país y multi-idioma. Marca: lujo artesanal zen, "Arraigado en tu intención" / "Rooted in
intention". Monorepo pnpm + Turborepo.
Lee esto antes de tocar código: define **dónde va cada cambio** y qué está prohibido.

## Mapa del repo

| Ruta                   | Qué es                                                      | Puede importar                                      |
| ---------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `packages/domain`      | Entidades, value objects (`Money`, `Locale`) y **puertos**  | Nada (TS puro)                                      |
| `packages/application` | Casos de uso (`ListProductsUseCase`…) que orquestan puertos | `domain`, `contracts`                               |
| `packages/contracts`   | DTOs serializables compartidos API ↔ web/admin              | Nada                                                |
| `packages/ui`          | Componentes React + HeroUI v3 y **tokens de diseño** (CSS)  | `contracts`, `@heroui/react`, `react`               |
| `packages/config`      | tsconfig, ESLint (fronteras de capas), Prettier             | —                                                   |
| `apps/api`             | NestJS 12 (ESM). Presentación + adapters de infraestructura | Todo lo anterior salvo `ui`; Prisma solo aquí       |
| `apps/web`             | Astro 7 + islas React. Storefront i18n                      | `ui`, `contracts`. **Nunca** `domain`/`application` |
| `apps/admin`           | Panel (Vite + React + HeroUI v3), `admin.antrina.com`       | `ui`, `contracts`. **Nunca** `domain`/`application` |

ESLint (`pnpm lint`) hace cumplir estas fronteras con `no-restricted-imports`.

## Arquitectura hexagonal (API)

Cada bounded context es un módulo con la misma forma:

```
apps/api/src/<contexto>/
  <contexto>.module.ts      # wiring: puerto -> adapter, caso de uso via useFactory
  <contexto>.tokens.ts      # Symbols de inyección para cada puerto
  presentation/             # controllers HTTP: parsean input, llaman casos de uso, devuelven contracts
  infrastructure/           # adapters: Prisma, pasarelas de pago, WhatsApp, etc.
```

Contextos actuales:

- `catalog`: lectura pública del catálogo. Dueño de los adapters de producto, foto (`ProductImage`)
  y almacenamiento (`S3ImageStorage`, puerto `ImageStorage`), que exporta a otros módulos.
- `admin-auth`: login con contraseña + 2FA TOTP, sesiones, guards (`AdminOriginGuard`,
  `AdminSessionGuard`, `@RequirePermission`, `@CurrentAdmin`) y `AuditLog`. Exporta guards y auditoría.
- `admin-catalog`: endpoints `/admin/products`, `/admin/products/:id/images`, `/admin/categories`.
- `site`: fotos editoriales de la tienda (`SiteImage`, una por hueco: `hero`, `story`, `corporate`),
  lectura pública en `GET /site/images?locale=`. `admin-site`: `/admin/site/images/:slot` (Portada del
  panel; clave `site/<slot>/<uuid>.webp`, la foto anterior se borra del bucket al reemplazarla).
- Catálogo público para SEO: `GET /catalog/products/:slug?locale=` (ficha; acepta el slug del idioma
  o el español), filtros `category`/`size`/`sign` en `/catalog/products` y `GET /catalog/product-index`
  (todos los activos con contenido por idioma: sitemap y feed de Google).
- `checkout` (puerto `PaymentGateway`, adapter que rechaza todo) y `notification` (puerto
  `OrderNotifier`, stub de WhatsApp que solo loguea).

Reservados para próximas fases: `cart`, `order`, `promotion` (entidad ya existe en dominio),
`admin-orders`, `admin-users`.

Los errores de dominio (`DomainError(message, code)`) se traducen a HTTP en `DomainExceptionFilter`
según el `code`: `auth.locked` → 423, `auth.forbidden` → 403, `auth.*` → 401, `*not_found` → 404,
`*.duplicate_*` → 409, resto → 422. Elige el `code` pensando en ese mapeo.

### Receta: agregar un caso de uso

1. Dominio: entidad/VO en `packages/domain/src/<ctx>/`, puerto en `.../<ctx>/ports/`. Exportar en `index.ts`.
2. Aplicación: `packages/application/src/<ctx>/<accion>.use-case.ts`; recibe puertos por constructor.
3. Contracts: DTO de entrada/salida en `packages/contracts/src/<ctx>.ts`.
4. API: adapter en `infrastructure/`, token en `<ctx>.tokens.ts`, provider `useFactory` en el módulo,
   endpoint en `presentation/` con `@Inject(UseCase)` explícito.
5. Si cambia la base: editar `apps/api/prisma/schema.prisma` y correr `pnpm db:migrate`.
6. Tests del caso de uso en `packages/application/test/*.test.ts` con fakes en memoria (`pnpm test`).

### Receta: endpoint del panel de administración

1. Caso de uso en `packages/application/src/<ctx>/admin/`: valida el body (no confíes en los tipos
   de contracts en runtime; usa `shared/input.ts`), recibe `actorId` y registra en `AuditLog`
   (`action` tipo `product.updated`, `changes` con el diff).
2. DTOs y rutas (`ADMIN_*_ROUTES`) en `packages/contracts/src/admin-*.ts`.
3. Controller en `apps/api/src/admin-<ctx>/presentation/` con
   `@UseGuards(AdminOriginGuard, AdminSessionGuard)` y `@RequirePermission('<permiso>')`;
   el admin llega con `@CurrentAdmin()`. El módulo importa `AdminAuthModule`.
4. Pantalla en `apps/admin/src/pages/`, llamadas con `api()` de `src/lib/api.ts` (cookies incluidas)
   y TanStack Query. Ruta en `src/main.tsx` dentro de `AdminLayout`.

### Seguridad del panel

- Sin registro público: altas con `pnpm admin:create` (CLI). Roles `OWNER` (todo) y `EDITOR`
  (catálogo); permisos en `AdminUser.can()`.
- Contraseña Argon2id (mín. 12). 2FA TOTP **obligatorio**: el primer login fuerza a configurarlo; la
  semilla se guarda cifrada con AES-256-GCM (`ADMIN_ENCRYPTION_KEY`).
- Sesión: token opaco en cookie `antrina_admin` (httpOnly, SameSite=Strict, Secure en producción,
  path `/admin`); en BD solo su hash SHA-256. Sesión pendiente (sin 2FA) 10 min, completa 8 h,
  cierre por inactividad a los 30 min. Tras el 2FA el token se rota.
- 5 fallos (contraseña o código) bloquean la cuenta 15 min. Rate limit de 10 req/min por IP en los
  pasos de acceso (`AuthRateLimitGuard`, en memoria; `@nestjs/throttler` es CommonJS y no carga en
  Vercel con Nest 12 ESM).
- Mutaciones solo desde `ADMIN_ORIGIN` (`AdminOriginGuard`); CORS con credenciales solo para ese
  origen y rutas `/admin`. Respuestas `/admin` con `Cache-Control: no-store` y `X-Robots-Tag: noindex`.
- Fotos: el navegador sube directo al bucket con URL firmada (5 min) y la API verifica el objeto
  (`stat`, tipo y tamaño) antes de registrarlo. Clave `products/<productId>/<uuid>.webp`, inmutable.
- Productos nunca se borran: se archivan (`ArchiveProductUseCase`).

### Reglas duras

- El dominio no importa Nest, Prisma, Express, Astro, React ni HeroUI.
- Los casos de uso no conocen Nest: se instancian con `useFactory` en el módulo.
- En Nest usa siempre `@Inject(Token)` explícito en constructores (no dependas de la metadata de tipos).
- Montos de dinero siempre en céntimos (`Money.ofCents`), moneda explícita (`PEN`/`USD`).
- Textos traducibles se guardan por locale (`*Translation`), nunca columnas `name_es`/`name_en`.
- Imports relativos con extensión `.js` en paquetes ESM (`domain`, `application`, `contracts`, `api`).
- Pagos, WhatsApp y almacenamiento de fotos solo detrás de sus puertos; nunca llamar SDKs externos
  (Culqi, Meta, AWS S3…) desde controllers o casos de uso.
- Las fotos se guardan como `storageKey`; la URL pública la construye `ImageUrlResolver` en la API.
  Nunca guardes URLs absolutas en la base.

## Frontend (apps/web, apps/admin + packages/ui)

- HeroUI **v3** (`@heroui/react` + `@heroui/styles`) con Tailwind CSS v4. Sin `HeroUIProvider`,
  sin `tailwind.config.*`, sin paquetes `@nextui-org/*` ni `@heroui/theme` (v2).
- Componentes compuestos (`Card.Content`, `Dropdown.Menu`) y `onPress` en vez de `onClick`.
- Solo se hidrata lo interactivo (`client:load`/`client:visible`); lo demás se renderiza estático.
- Textos de UI de la portada en `apps/web/src/i18n/dictionaries.ts`, de las páginas internas en
  `i18n/pages.ts`; intenciones, signos y tamaños (con slug traducido) en `i18n/taxonomy.ts`;
  significados de piedras en `content/stones.ts` y páginas largas (historia, envíos…) en
  `content/pages.ts`. Los componentes de `ui` reciben labels y hrefs por props.
- Rutas siempre con `routes` (`apps/web/src/lib/routes.ts`): segmentos y slugs traducidos
  (`/intencion/amor` ↔ `/en/intention/love`, `/arbol/<slug>` ↔ `/en/tree/<slug>`), `es` sin prefijo
  y `en` bajo `/en`.
- Cada página en `src/pages/` es un envoltorio fino por idioma (es y `en/`) que carga datos
  (`lib/page-data.ts`), fija el estado HTTP (404 si el slug no existe, 503 si la API falla, 301 al slug
  propio del idioma) y renderiza una vista de `components/views/`.
- Páginas de tienda envueltas en `StoreLayout.astro` (franja superior, header, footer).

### SEO (obligatorio en toda página nueva)

- `StoreLayout` exige `title` (sin la marca; se añade " · Antrina"), `description` (~155 caracteres)
  y `alternates` (`alternatesFor(...)`, la ruta en cada idioma que exista): genera canonical,
  hreflang (`es`, `en`, `x-default`), Open Graph y Twitter. Imagen social por defecto
  `public/og-default.jpg`; pasa `image` si la página tiene foto propia.
- Un solo `h1` por página. Datos estructurados con `lib/structured-data.ts` (`breadcrumbs`,
  `product`, `itemList`, `article`, `faq`, `organization`/`website` en la portada) vía `jsonLd`.
- Páginas sin valor para Google (búsqueda, carrito, cuenta, 404) con `noindex`; las de producto sin
  traducción propia también (canonical a la española). Las nuevas páginas indexables van en
  `pages/sitemap.xml.ts`.
- `robots.txt`, `sitemap.xml` y `feeds/google-merchant.xml` (solo productos con foto) se generan
  en `src/pages/`. Dominio en `PUBLIC_SITE_URL` (todas las URLs absolutas salen de `lib/site.ts`).
- Fotos con `toImageSource`/`cardImage` (`lib/images.ts`): `srcset` vía el optimizador de Vercel
  (solo hosts de `MEDIA_HOST`), `width`/`height` siempre y `priority` solo en la foto principal.
- Textos de piedras en tono de tradición ("se asocia con"); nunca promesas de salud (Merchant
  Center las rechaza).
- Panel (`apps/admin`): SPA solo en español, rutas en español (`/productos`, `/configurar-2fa`),
  `noindex` + `robots.txt` que lo bloquea todo. Comparte la marca con la tienda pero tiene su propia
  capa visual de herramienta de trabajo (ver "Panel" abajo).

### Sistema de diseño (obligatorio): "Galería mineral"

Fuente única: `packages/ui/src/styles/tokens.css` (variables en `:root` + `@theme inline`, clases
de tipografía y layout). `apps/web/src/styles/global.css` solo importa Tailwind, HeroUI y ese
archivo; `apps/admin/src/styles.css` lo importa y sobrescribe lo indicado en "Panel".

- **Color:** solo tokens. Nada de hex sueltos, paletas de Tailwind (`red-500`…) ni degradados.
  Proporción ~75% piedra, ~20% carbón, ~5% amatista + arcilla.
  - Piedra: `bg-bg`, `bg-bg-alt`, `bg-surface` · Carbón: `text-text`, `text-text-secondary`,
    `text-text-muted`.
  - `bg-brand` / `hover:bg-brand-hover` / `bg-brand-tint` (amatista): logo, botón principal,
    énfasis en títulos y estados activos. `accent` en Tailwind está reservado para HeroUI (= marca).
  - `bg-quartz` (cuarzo rosa): superficies suaves y hover de tarjetas. `text-clay` / `bg-clay`
    (arcilla): detalles pequeños (piedras, puntos), nunca texto largo.
  - Bloques carbón con `.surface-dark` (historia, pie): texto `text-on-dark` /
    `text-on-dark-muted`, bordes `border-border-dark`; ahí el énfasis pasa a cuarzo.
  - `border-border`, `border-border-strong`.
- **Tipografía:** solo Bricolage Grotesque (títulos, 500–600, tracking negativo), Geist (texto) y
  Geist Mono (etiquetas). Clases `type-display` (hero), `type-h1`, `type-h2`, `type-h3`,
  `type-body`, `type-label` (mono), `type-menu`, `type-price` (mono). Sin serif, sin itálicas y
  sin rótulos en mayúsculas con tracking. Para resaltar 1–2 palabras de un título escribe
  `*palabras*` en el diccionario y renderiza con `<Emphasis>` (color marca).
- **Secciones:** cada sección abre con `SectionIndex` ("01 — Intenciones", mono + línea fina) vía
  `SectionHeading`; el número lo pasa la página (`index`) y la etiqueta corta viene del diccionario
  (`label`).
- **Botones:** píldora (`--button-radius`). `ButtonLink variant="primary"` (amatista) como máximo
  **una vez por vista**; el resto `secondary` (contorno), `inverse` sobre carbón o `ArrowLink`
  (texto subrayado con flecha). En islas, `Button` de HeroUI.
- **Formas:** `rounded-sm` (4px) o `rounded-md` (6px) para tarjetas, imágenes y campos. Sin
  `box-shadow` salvo foco accesible y overlays (popover, modal, drawer). Separa con líneas de 1px.
- **Cabecera:** franja carbón fina (mensaje + ES/EN) y una sola fila (logo, menú, iconos). Menús
  con `Popover` (mega menú con piedra en mono), búsqueda en `Modal`, móvil con `Drawer` +
  `Accordion`. Al hacer scroll usa `.header-glass` (única transparencia permitida junto al backdrop).
- **Espaciado:** `.section` (80px móvil / 128px escritorio), `.container-page` (máx. 1360px),
  `.measure` (máx. 620px para texto largo). Ante la duda, más espacio.
- **Producto:** imagen 4:5 `rounded-md` sobre `bg-bg-alt`, nombre en Geist 500, precio en mono,
  intención como `type-label`, zoom 1.03 en 400ms. **Nunca** descuentos visibles (ni tachados ni %).
  Etiquetas permitidas con `Chip`: `NEW`, `CUSTOMIZABLE`, `LIMITED_EDITION`.
- **Imágenes:** mientras no haya fotos reales, `PhotoPlaceholder` (rectángulo `bg-bg-alt` + texto
  mono). Nunca ilustraciones genéricas ni recortes sobre blanco puro.
- **Iconos:** línea fina, `strokeWidth` 1.5, color `text`. Sin emojis en la UI.

#### Panel (`apps/admin`)

Lo anterior es para la tienda. El panel es una herramienta densa y neutra; sus excepciones viven
solo en `apps/admin/src/styles.css`:

- **Tipografía:** Geist Variable en todo (Geist Mono para SKU, URL y claves), sin Bricolage ni
  `type-*`. Clases `panel-title`, `panel-heading`, `panel-meta`, `panel-num` (cifras tabulares) y
  `panel-card`. Base 14px.
- **Color:** superficies grises cálidas y blanco; amatista solo en acción principal y estado activo.
  Estados con `success`/`warning`/`danger` (+ `-tint`) vía `StatusBadge`.
- **Formas:** radios 6/8px, también en botones (`--button-radius`, sin píldora); sombra solo en
  overlays (drawer, modal, popover).
- **Patrones:** lista en tabla compacta (lista simple en móvil); crear/editar en `Drawer` lateral sobre
  la lista (`/productos/:id`, `nuevo` para alta) con pestañas y pie fijo; confirmaciones con
  `ConfirmDialog`; feedback con `toast`. Iconos en `components/icons.tsx`.

## Comandos

```bash
nvm use                 # Node 22 (.nvmrc)
pnpm install
pnpm services:up        # Postgres 16 (:5433) + MinIO (:9000, consola :9001) + bucket público
pnpm db:migrate         # migraciones Prisma (apps/api)
pnpm db:seed            # intenciones + árboles de cuarzo de ejemplo
pnpm admin:create --email <correo> --name <nombre> --role OWNER   # alta de administrador
pnpm dev                # web :4321 + admin :5174 + api :3001 (+ watch de packages)
pnpm dev:admin          # solo panel + api
pnpm build | pnpm typecheck | pnpm lint | pnpm test | pnpm format
```

Variables: copiar `.env.example` a `apps/api/.env`, `apps/web/.env` y `apps/admin/.env`.
En la web: `PUBLIC_SITE_URL` (dominio canónico), `PUBLIC_WHATSAPP_NUMBER` (sin "+", activa los botones
de pedido), `PUBLIC_CONTACT_EMAIL` y `PUBLIC_GOOGLE_SITE_VERIFICATION` (Search Console).
`ADMIN_ENCRYPTION_KEY` es obligatoria (`openssl rand -base64 32`). Variables nuevas: añadirlas
también a `globalPassThroughEnv` en `turbo.json`.

## Antes de terminar una tarea

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` deben pasar. Si tocaste UI, revisa `/` y
`/en` en el navegador a 375px y 1440px; si tocaste el panel, `http://localhost:5174` a las mismas
anchuras.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
