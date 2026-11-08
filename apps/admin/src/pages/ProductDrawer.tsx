import {
  Button,
  Description,
  Drawer,
  Input,
  InputGroup,
  Label,
  Skeleton,
  Switch,
  Tabs,
  Tag,
  TagGroup,
  TextArea,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminCategoryDto,
  type AdminProductDto,
  type ProductBadgeCode,
  type ProductIntentionCode,
  type ProductSizeCode,
  type ProductStatusCode,
  type StockMovementListResponse,
  type UpsertProductRequest,
  type ZodiacSignCode,
  PRODUCT_STONES,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { CategoryDialog, type CategoryDialogState } from '../components/CategoryDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconPlus } from '../components/icons';
import { Choice } from '../components/PageKit';
import { PhotoManager } from '../components/PhotoManager';
import { PiecesPanel } from '../components/PiecesPanel';
import { StatusBadge } from '../components/StatusBadge';
import { StockDialog, type StockTarget } from '../components/StockDialog';
import { api, STORE_URL } from '../lib/api';
import {
  BADGE_LABELS,
  centsToInput,
  formatDate,
  INTENTION_LABELS,
  MOVEMENT_LABELS,
  parsePriceToCents,
  SIGN_LABELS,
  SIZE_LABELS,
  slugify,
  STATUS_LABELS,
} from '../lib/format';

type Lang = 'es' | 'en';
type Tab = 'detalles' | 'fotos' | 'historial' | 'qr' | 'google';

const TABS: readonly Tab[] = ['detalles', 'fotos', 'historial', 'qr', 'google'];
/** Lo que Google suele mostrar antes de cortar con "…". */
const META_TITLE_IDEAL = 60;
const META_DESCRIPTION_IDEAL = 155;

const NEW_ID = 'nuevo';
const CLOSE_ANIMATION_MS = 220;
const TREES_CATEGORY_SLUG = 'arboles-de-cuarzo';
const STORE_PATH: Record<'tree' | 'other', Record<Lang, string>> = {
  tree: { es: '/arbol/', en: '/en/tree/' },
  other: { es: '/producto/', en: '/en/product/' },
};
const NO_SUBCATEGORY = 'NONE';
const DEFAULT_LOW_STOCK = '3';
const STORE_HOST = STORE_URL.replace(/^https?:\/\//, '') || 'antrina.vercel.app';

interface ContentForm {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

interface FormState {
  sku: string;
  /** Categoría principal; `subcategoryId` es la subcategoría si la hay. */
  rootCategoryId: string;
  subcategoryId: string;
  /** Precio normal. */
  price: string;
  /** Precio de oferta; vacío = sin oferta. */
  offerPrice: string;
  cost: string;
  /** Stock inicial al crear. Después se cambia con movimientos de inventario. */
  stock: string;
  lowStockThreshold: string;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | 'NONE';
  size: ProductSizeCode | 'NONE';
  intention: ProductIntentionCode | 'NONE';
  signs: ZodiacSignCode[];
  stones: string[];
  origin: string;
  content: Record<Lang, ContentForm>;
  /** Mientras no se edite a mano, el slug sigue al nombre. */
  slugEdited: Record<Lang, boolean>;
  /** Mientras no se edite a mano, el SKU sigue al nombre. */
  skuEdited: boolean;
}

const EMPTY_CONTENT: ContentForm = {
  name: '',
  slug: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
};

function contentForm(content: AdminProductDto['content']['es'] | null): ContentForm {
  if (!content) return { ...EMPTY_CONTENT };
  return {
    ...content,
    metaTitle: content.metaTitle ?? '',
    metaDescription: content.metaDescription ?? '',
  };
}

function contentRequest(content: ContentForm) {
  return {
    ...content,
    metaTitle: content.metaTitle.trim() || null,
    metaDescription: content.metaDescription.trim() || null,
  };
}

function initialState(
  product: AdminProductDto | undefined,
  categories: AdminCategoryDto[],
): FormState {
  if (!product) {
    return {
      sku: '',
      rootCategoryId: '',
      subcategoryId: NO_SUBCATEGORY,
      price: '',
      offerPrice: '',
      cost: '',
      stock: '1',
      lowStockThreshold: DEFAULT_LOW_STOCK,
      status: 'DRAFT',
      isFeatured: false,
      badge: 'NONE',
      size: 'NONE',
      intention: 'NONE',
      signs: [],
      stones: [],
      origin: 'Taller Antrina, Lima',
      content: { es: { ...EMPTY_CONTENT }, en: { ...EMPTY_CONTENT } },
      slugEdited: { es: false, en: false },
      skuEdited: false,
    };
  }
  const category = categories.find((item) => item.id === product.categoryId);
  const hasOffer = product.compareAtPrice !== null;
  return {
    sku: product.sku,
    rootCategoryId: category?.parentId ?? product.categoryId,
    subcategoryId: category?.parentId ? product.categoryId : NO_SUBCATEGORY,
    price: centsToInput(product.compareAtPrice?.amount ?? product.price.amount),
    offerPrice: hasOffer ? centsToInput(product.price.amount) : '',
    cost: product.cost ? centsToInput(product.cost.amount) : '',
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge ?? 'NONE',
    size: product.size ?? 'NONE',
    intention: product.intention ?? 'NONE',
    signs: [...product.signs],
    stones: [...product.stones],
    origin: product.origin ?? '',
    content: { es: contentForm(product.content.es), en: contentForm(product.content.en) },
    slugEdited: { es: true, en: Boolean(product.content.en) },
    skuEdited: true,
  };
}

/** Lo que se compara para saber si hay cambios sin guardar. */
function snapshot({ slugEdited: _slug, skuEdited: _sku, ...state }: FormState): string {
  return JSON.stringify(state);
}

function toRequest(state: FormState): UpsertProductRequest | string {
  const { es, en } = state.content;
  if (!es.name.trim()) return 'Escribe el nombre en español.';
  if (!es.slug.trim()) return 'Falta la URL en español.';
  if (en.name.trim() && !en.slug.trim()) return 'Falta la URL en inglés.';
  if (!state.sku.trim()) return 'Escribe el SKU.';
  const regularCents = parsePriceToCents(state.price);
  if (regularCents === null || regularCents <= 0)
    return 'Escribe un precio válido, por ejemplo 289 o 289.50.';
  const offerCents = state.offerPrice.trim() ? parsePriceToCents(state.offerPrice) : null;
  if (state.offerPrice.trim() && (offerCents === null || offerCents <= 0))
    return 'Escribe un precio de oferta válido o déjalo vacío.';
  if (offerCents !== null && offerCents >= regularCents)
    return 'El precio de oferta debe ser menor que el precio normal.';
  const costCents = state.cost.trim() ? parsePriceToCents(state.cost) : null;
  if (state.cost.trim() && costCents === null) return 'Escribe un costo válido o déjalo vacío.';
  const stock = Number(state.stock);
  if (!Number.isInteger(stock) || stock < 0) return 'El stock debe ser un número entero (0 o más).';
  const lowStockThreshold = Number(state.lowStockThreshold);
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0)
    return 'La alerta de stock debe ser un número entero (0 o más).';
  if (!state.rootCategoryId) return 'Elige la categoría del producto.';
  return {
    sku: state.sku.trim(),
    categoryId: state.subcategoryId === NO_SUBCATEGORY ? state.rootCategoryId : state.subcategoryId,
    priceCents: offerCents ?? regularCents,
    compareAtPriceCents: offerCents === null ? null : regularCents,
    costCents,
    currency: 'PEN',
    stock,
    lowStockThreshold,
    status: state.status,
    isFeatured: state.isFeatured,
    badge: state.badge === 'NONE' ? null : state.badge,
    size: state.size === 'NONE' ? null : state.size,
    intention: state.intention === 'NONE' ? null : state.intention,
    signs: state.signs,
    stones: state.stones,
    origin: state.origin.trim() || null,
    content: { es: contentRequest(es), en: en.name.trim() ? contentRequest(en) : null },
  };
}

/** Editor en panel lateral sobre la lista: `/productos/nuevo` y `/productos/:id`. */
export function ProductDrawer() {
  const { id = NEW_ID } = useParams();
  const isNew = id === NEW_ID;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = useRef(false);

  const product = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => api<AdminProductDto>('GET', ADMIN_CATALOG_ROUTES.product(id)),
    enabled: !isNew,
  });
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<AdminCategoryDto[]>('GET', ADMIN_CATALOG_ROUTES.categories),
    staleTime: 5 * 60_000,
  });

  const close = () => {
    setConfirmDiscard(false);
    setIsOpen(false);
    window.setTimeout(() => void navigate('/productos'), CLOSE_ANIMATION_MS);
  };
  const requestClose = () => (dirty.current ? setConfirmDiscard(true) : close());

  const isLoading = (!isNew && product.isPending) || categories.isPending;
  const loadError = product.error ?? categories.error;

  return (
    <>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <Drawer.Content placement="right">
          <Drawer.Dialog
            aria-label={isNew ? 'Nuevo producto' : 'Editar producto'}
            className="w-full max-w-full p-0 sm:w-[min(760px,100vw)]"
          >
            {isLoading ? (
              <DrawerSkeleton />
            ) : loadError ? (
              <div className="p-6">
                <ErrorNotice error={loadError} title="No se pudo cargar el producto" />
              </div>
            ) : (
              <ProductEditor
                key={product.data?.id ?? NEW_ID}
                product={product.data}
                categories={categories.data ?? []}
                onDirtyChange={(value) => {
                  dirty.current = value;
                }}
                onClose={requestClose}
              />
            )}
            <Drawer.CloseTrigger aria-label="Cerrar" />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      <ConfirmDialog
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="¿Descartar los cambios?"
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        tone="warning"
        onConfirm={close}
      >
        Hay cambios sin guardar en este producto. Si cierras ahora se perderán.
      </ConfirmDialog>
    </>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6" aria-label="Cargando producto">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="h-6 w-64 rounded-sm" />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="flex min-h-8 items-center justify-between gap-4">
        <h3 className="panel-heading">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CharCount({ value, ideal }: { value: string; ideal: number }) {
  const length = value.trim().length;
  return (
    <Description className={length > ideal ? 'text-warning' : undefined}>
      <span className="panel-num">
        {length}/{ideal}
      </span>
      {length > ideal ? ' · Google lo cortará' : ' caracteres recomendados'}
    </Description>
  );
}

function SearchPreview({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const clip = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
      <span className="truncate font-mono text-[12px] text-text-muted">{url}</span>
      <span className="text-[17px] leading-snug text-brand">
        {clip(`${title} · Antrina`, META_TITLE_IDEAL + 10)}
      </span>
      <span className="text-[13px] leading-relaxed text-text-secondary">
        {clip(description, META_DESCRIPTION_IDEAL)}
      </span>
    </div>
  );
}

function StockHistory({ productId }: { productId: string }) {
  const movements = useQuery({
    queryKey: ['admin', 'stock-movements', { productId }],
    queryFn: () =>
      api<StockMovementListResponse>(
        'GET',
        `${ADMIN_CATALOG_ROUTES.stockMovements}?productId=${productId}&pageSize=50`,
      ),
  });
  if (movements.error) {
    return <ErrorNotice error={movements.error} title="No se pudo cargar el historial" />;
  }
  if (movements.isPending) return <Skeleton className="h-24 w-full rounded-md" />;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {movements.data.data.map((movement) => (
        <li key={movement.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13.5px] font-medium text-text">
              {MOVEMENT_LABELS[movement.type]}
              {movement.orderNumber && (
                <span className="font-normal text-text-muted"> #{movement.orderNumber}</span>
              )}
            </span>
            <span className="panel-meta truncate">
              {formatDate(movement.createdAt)}
              {movement.adminName && ` · ${movement.adminName}`}
              {movement.note && ` · ${movement.note}`}
            </span>
          </div>
          <span
            className={`panel-num text-[13.5px] font-medium ${movement.quantity < 0 ? 'text-danger' : 'text-success'}`}
          >
            {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
          </span>
          <span className="panel-num w-10 text-right text-[13px] text-text-muted">
            {movement.stockAfter}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProductEditor({
  product,
  categories,
  onDirtyChange,
  onClose,
}: {
  product: AdminProductDto | undefined;
  categories: AdminCategoryDto[];
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = TABS.find((value) => value === searchParams.get('tab')) ?? 'detalles';
  const tab: Tab = requestedTab === 'fotos' && !product ? 'detalles' : requestedTab;
  const [state, setState] = useState<FormState>(() => initialState(product, categories));
  const [baseline, setBaseline] = useState(() => snapshot(initialState(product, categories)));
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState | null>(null);
  const [stockTarget, setStockTarget] = useState<StockTarget | null>(null);
  const [lang, setLang] = useState<Lang>('es');
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const isDirty = snapshot(state) !== baseline;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const setTab = (next: Tab) =>
    setSearchParams(next === 'detalles' ? {} : { tab: next }, { replace: true });

  const save = useMutation({
    mutationFn: (body: UpsertProductRequest) =>
      product
        ? api<AdminProductDto>('PUT', ADMIN_CATALOG_ROUTES.product(product.id), body)
        : api<AdminProductDto>('POST', ADMIN_CATALOG_ROUTES.products, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (product) {
        setBaseline(snapshot(state));
        toast.success('Cambios guardados');
      } else {
        onDirtyChange(false);
        toast.success('Producto creado', { description: 'Ahora puedes subir sus fotos.' });
        void navigate(`/productos/${saved.id}?tab=fotos`, { replace: true });
      }
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      api<AdminProductDto>('POST', ADMIN_CATALOG_ROUTES.archiveProduct(product?.id ?? '')),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setState((current) => ({ ...current, status: saved.status }));
      setBaseline((current) => {
        const parsed = JSON.parse(current) as Omit<FormState, 'slugEdited'>;
        return JSON.stringify({ ...parsed, status: saved.status });
      });
      setConfirmArchive(false);
      toast.success('Producto archivado', { description: 'Ya no aparece en la tienda.' });
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  const setContent = (field: keyof ContentForm, value: string) =>
    setState((current) => {
      const content = { ...current.content[lang], [field]: value };
      const slugEdited = { ...current.slugEdited };
      if (field === 'name' && !current.slugEdited[lang]) content.slug = slugify(value);
      if (field === 'slug') slugEdited[lang] = true;
      const followSku = field === 'name' && lang === 'es' && !current.skuEdited;
      return {
        ...current,
        ...(followSku ? { sku: slugify(value).toUpperCase().slice(0, 32).replace(/-+$/, '') } : {}),
        content: { ...current.content, [lang]: content },
        slugEdited,
      };
    });

  const submit = () => {
    const request = toRequest(state);
    if (typeof request === 'string') {
      setClientError(request);
      setTab('detalles');
      return;
    }
    setClientError(null);
    save.mutate(request);
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const content = state.content[lang];
  const enIsEmpty = !state.content.en.name.trim();
  const rootCategories = categories.filter((category) => !category.parentId);
  const rootCategory = categories.find((category) => category.id === state.rootCategoryId);
  const subcategories = categories.filter((category) => category.parentId === state.rootCategoryId);
  const isTree = rootCategory?.slug === TREES_CATEGORY_SLUG;
  const storePath = STORE_PATH[isTree ? 'tree' : 'other'];
  const regularCents = parsePriceToCents(state.price);
  const offerCents = state.offerPrice.trim() ? parsePriceToCents(state.offerPrice) : null;
  const costCents = state.cost.trim() ? parsePriceToCents(state.cost) : null;
  const sellingCents = offerCents ?? regularCents;
  const offerIsValid =
    offerCents !== null && regularCents !== null && offerCents > 0 && offerCents < regularCents;
  const discountPercent = offerIsValid
    ? Math.round(((regularCents - offerCents) / regularCents) * 100)
    : null;
  const marginCents =
    costCents !== null && sellingCents !== null && sellingCents > 0
      ? sellingCents - costCents
      : null;
  const marginPercent =
    marginCents !== null && sellingCents ? Math.round((marginCents / sellingCents) * 100) : null;
  const langToggle = (
    <ToggleButtonGroup
      size="sm"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[lang]}
      onSelectionChange={(keys) => {
        const [next] = [...keys];
        if (next === 'es' || next === 'en') setLang(next);
      }}
      aria-label="Idioma del contenido"
    >
      <ToggleButton id="es" className="text-[12.5px]">
        Español
      </ToggleButton>
      <ToggleButton id="en" className="text-[12.5px]">
        English
        {enIsEmpty && <span className="text-text-muted"> · opcional</span>}
      </ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <>
      <Drawer.Header className="gap-0 px-6 pt-5">
        <div className="flex h-6 items-center gap-2 pr-10">
          {product ? (
            <>
              <StatusBadge status={product.status} />
              <span className="truncate font-mono text-[12px] text-text-muted">{product.sku}</span>
            </>
          ) : (
            <span className="text-[12.5px] text-text-muted">Catálogo</span>
          )}
        </div>
        <Drawer.Heading className="mt-2 truncate pr-10 text-[18px] font-semibold tracking-[-0.02em] text-text">
          {product ? product.content.es.name : 'Nuevo producto'}
        </Drawer.Heading>
      </Drawer.Header>

      <Tabs
        variant="secondary"
        selectedKey={tab}
        onSelectionChange={(key) => setTab(key as Tab)}
        disabledKeys={product ? [] : ['fotos']}
        className="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <Tabs.ListContainer className="border-b border-border px-6">
          <Tabs.List aria-label="Secciones del producto" className="w-max min-w-0 gap-1 px-0">
            <Tabs.Tab id="detalles" className="w-auto px-3 text-[13px]">
              Detalles
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="fotos" className="w-auto px-3 text-[13px]">
              Fotos
              {product && (
                <span className="panel-num ml-1.5 rounded-full bg-bg-alt px-1.5 text-[11px] font-medium text-text-secondary">
                  {product.images.length}
                </span>
              )}
              <Tabs.Indicator />
            </Tabs.Tab>
            {product && (
              <Tabs.Tab id="historial" className="w-auto px-3 text-[13px]">
                Historial
                <Tabs.Indicator />
              </Tabs.Tab>
            )}
            {product && (
              <Tabs.Tab id="qr" className="w-auto px-3 text-[13px]">
                QR
                <Tabs.Indicator />
              </Tabs.Tab>
            )}
            <Tabs.Tab id="google" className="w-auto px-3 text-[13px]">
              Google
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Drawer.Body className="m-0 px-6 py-6">
          <Tabs.Panel id="detalles" className="p-0">
            <form id="product-form" className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
              {clientError && (
                <ErrorNotice error={new Error(clientError)} title="Revisa el formulario" />
              )}
              <ErrorNotice error={save.error} title="No se pudo guardar" />
              <ErrorNotice error={archive.error} title="No se pudo archivar" />

              <Section title="Contenido" aside={langToggle}>
                <TextField
                  key={`${lang}-name`}
                  isRequired={lang === 'es'}
                  value={content.name}
                  onChange={(value) => setContent('name', value)}
                >
                  <Label>Nombre</Label>
                  <Input
                    maxLength={120}
                    placeholder={lang === 'es' ? 'Vela de lavanda' : 'Lavender candle'}
                  />
                </TextField>
                <TextField
                  key={`${lang}-slug`}
                  isRequired={lang === 'es' || !enIsEmpty}
                  value={content.slug}
                  onChange={(value) => setContent('slug', value)}
                >
                  <Label>URL</Label>
                  <InputGroup>
                    <InputGroup.Prefix className="font-mono text-[12px] text-text-muted">
                      {storePath[lang]}
                    </InputGroup.Prefix>
                    <InputGroup.Input maxLength={140} className="font-mono text-[13px]" />
                  </InputGroup>
                  <Description>
                    Se genera desde el nombre. Minúsculas, números y guiones.
                  </Description>
                </TextField>
                <TextField
                  key={`${lang}-description`}
                  value={content.description}
                  onChange={(value) => setContent('description', value)}
                >
                  <Label>Descripción</Label>
                  <TextArea rows={4} maxLength={4000} />
                </TextField>
              </Section>

              <Section
                title="Categoría"
                aside={
                  <Button size="sm" variant="ghost" onPress={() => setCategoryDialog({})}>
                    <IconPlus size={14} />
                    Nueva categoría
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Choice
                    label="Categoría"
                    isRequired
                    placeholder="Elige una categoría"
                    value={state.rootCategoryId || null}
                    onChange={(value) =>
                      setState((current) => ({
                        ...current,
                        rootCategoryId: value,
                        subcategoryId: NO_SUBCATEGORY,
                      }))
                    }
                    options={rootCategories.map((category) => ({
                      id: category.id,
                      label: category.name,
                    }))}
                  />
                  <Choice
                    label="Subcategoría"
                    value={state.subcategoryId}
                    isDisabled={!rootCategory}
                    onChange={(value) => set('subcategoryId', value)}
                    options={[
                      { id: NO_SUBCATEGORY, label: 'Sin subcategoría' },
                      ...subcategories.map((category) => ({
                        id: category.id,
                        label: category.name,
                      })),
                    ]}
                  />
                </div>
                {rootCategory && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start"
                    onPress={() => setCategoryDialog({ parentId: rootCategory.id })}
                  >
                    <IconPlus size={14} />
                    Nueva subcategoría en {rootCategory.name}
                  </Button>
                )}
              </Section>

              <Section title="Precio">
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    isRequired
                    value={state.price}
                    onChange={(value) => set('price', value)}
                  >
                    <Label>Precio normal</Label>
                    <InputGroup>
                      <InputGroup.Prefix className="text-[13px] text-text-muted">
                        S/
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        inputMode="decimal"
                        placeholder="289"
                        className="panel-num"
                      />
                    </InputGroup>
                  </TextField>
                  <TextField
                    value={state.offerPrice}
                    onChange={(value) => set('offerPrice', value)}
                  >
                    <Label>Precio de oferta</Label>
                    <InputGroup>
                      <InputGroup.Prefix className="text-[13px] text-text-muted">
                        S/
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        inputMode="decimal"
                        placeholder="Opcional"
                        className="panel-num"
                      />
                    </InputGroup>
                    {discountPercent !== null ? (
                      <Description className="text-success">
                        {discountPercent}% de descuento
                      </Description>
                    ) : state.offerPrice.trim() ? (
                      <Description className="text-danger">
                        Debe ser menor que el precio normal
                      </Description>
                    ) : null}
                  </TextField>
                  <TextField value={state.cost} onChange={(value) => set('cost', value)}>
                    <Label>Costo</Label>
                    <InputGroup>
                      <InputGroup.Prefix className="text-[13px] text-text-muted">
                        S/
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        inputMode="decimal"
                        placeholder="Opcional"
                        className="panel-num"
                      />
                    </InputGroup>
                    {marginCents !== null ? (
                      <Description className={marginCents < 0 ? 'text-danger' : undefined}>
                        Ganas {formatMoney({ amount: marginCents, currency: 'PEN' }, 'es')} (
                        {marginPercent}%)
                      </Description>
                    ) : (
                      <Description>Solo lo ves tú. Calcula tu margen.</Description>
                    )}
                  </TextField>
                </div>
                <p className="panel-meta">
                  Con oferta, la tienda muestra el precio normal tachado junto al de oferta.
                </p>
              </Section>

              <Section title="Inventario">
                <div className="grid gap-4 sm:grid-cols-3">
                  {product ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-text">Stock</span>
                      <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-border px-3">
                        <span
                          className={`panel-num text-[14px] font-medium ${product.stock === 0 ? 'text-danger' : 'text-text'}`}
                        >
                          {product.stock}
                        </span>
                        <button
                          type="button"
                          className="text-[12.5px] font-medium text-text-secondary hover:text-text hover:underline"
                          onClick={() =>
                            setStockTarget({
                              id: product.id,
                              name: product.content.es.name,
                              stock: product.stock,
                            })
                          }
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <TextField
                      isRequired
                      type="number"
                      value={state.stock}
                      onChange={(value) => set('stock', value)}
                    >
                      <Label>Stock inicial</Label>
                      <Input min={0} step={1} className="panel-num" />
                    </TextField>
                  )}
                  <TextField
                    type="number"
                    value={state.lowStockThreshold}
                    onChange={(value) => set('lowStockThreshold', value)}
                  >
                    <Label>Avisar con</Label>
                    <Input min={0} step={1} className="panel-num" />
                    <Description>unidades o menos</Description>
                  </TextField>
                  <TextField
                    isRequired
                    value={state.sku}
                    onChange={(value) =>
                      setState((current) => ({
                        ...current,
                        sku: value.toUpperCase(),
                        skuEdited: true,
                      }))
                    }
                  >
                    <Label>SKU</Label>
                    <Input
                      maxLength={32}
                      placeholder="VELA-LAVANDA"
                      className="font-mono text-[13px]"
                    />
                    <Description>Código interno único.</Description>
                  </TextField>
                </div>
              </Section>

              <Section title="En la tienda">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Choice
                    label="Estado"
                    value={state.status}
                    onChange={(value) => set('status', value as ProductStatusCode)}
                    options={(Object.keys(STATUS_LABELS) as ProductStatusCode[]).map((code) => ({
                      id: code,
                      label: STATUS_LABELS[code],
                    }))}
                  />
                  <Choice
                    label="Etiqueta"
                    value={state.badge}
                    onChange={(value) => set('badge', value as FormState['badge'])}
                    options={[
                      { id: 'NONE', label: 'Ninguna' },
                      ...(Object.keys(BADGE_LABELS) as ProductBadgeCode[]).map((code) => ({
                        id: code,
                        label: BADGE_LABELS[code],
                      })),
                    ]}
                  />
                  <Choice
                    label="Intención"
                    value={state.intention}
                    onChange={(value) => set('intention', value as FormState['intention'])}
                    options={[
                      { id: 'NONE', label: 'Sin intención' },
                      ...(Object.keys(INTENTION_LABELS) as ProductIntentionCode[]).map((code) => ({
                        id: code,
                        label: INTENTION_LABELS[code],
                      })),
                    ]}
                  />
                  <TextField value={state.origin} onChange={(value) => set('origin', value)}>
                    <Label>Origen</Label>
                    <Input maxLength={120} />
                  </TextField>
                  {isTree && (
                    <Choice
                      label="Tamaño del árbol"
                      value={state.size}
                      onChange={(value) => set('size', value as FormState['size'])}
                      options={[
                        { id: 'NONE', label: 'Sin tamaño' },
                        ...(Object.keys(SIZE_LABELS) as ProductSizeCode[]).map((code) => ({
                          id: code,
                          label: SIZE_LABELS[code],
                        })),
                      ]}
                    />
                  )}
                </div>
                {isTree && (
                  <TagGroup
                    selectionMode="multiple"
                    selectedKeys={state.signs}
                    onSelectionChange={(keys) =>
                      set(
                        'signs',
                        (Object.keys(SIGN_LABELS) as ZodiacSignCode[]).filter((code) =>
                          keys === 'all' ? true : keys.has(code),
                        ),
                      )
                    }
                    size="sm"
                    className="flex flex-col gap-2"
                  >
                    <Label>Signos</Label>
                    <TagGroup.List className="flex flex-wrap gap-1.5">
                      {(Object.keys(SIGN_LABELS) as ZodiacSignCode[]).map((code) => (
                        <Tag key={code} id={code} textValue={SIGN_LABELS[code]}>
                          {SIGN_LABELS[code]}
                        </Tag>
                      ))}
                    </TagGroup.List>
                    <Description>
                      Signos cuya piedra lleva el árbol. Aparece en la página de cada signo.
                    </Description>
                  </TagGroup>
                )}
                <TagGroup
                  selectionMode="multiple"
                  selectedKeys={state.stones}
                  onSelectionChange={(keys) =>
                    set(
                      'stones',
                      PRODUCT_STONES.map((stone) => stone.id)
                        .filter((id) => (keys === 'all' ? true : keys.has(id)))
                        .slice(0, 12),
                    )
                  }
                  size="sm"
                  className="flex flex-col gap-2"
                >
                  <Label>Piedras de la pieza</Label>
                  <TagGroup.List className="flex flex-wrap gap-1.5">
                    {PRODUCT_STONES.map((stone) => (
                      <Tag key={stone.id} id={stone.id} textValue={stone.name.es}>
                        {stone.name.es}
                      </Tag>
                    ))}
                  </TagGroup.List>
                  <Description>
                    Las piedras que lleva de verdad (máximo 12). Se muestran en la tienda de "Tu
                    cielo" y permiten buscar piezas por piedra.
                  </Description>
                </TagGroup>
                <Switch
                  isSelected={state.isFeatured}
                  onChange={(value) => set('isFeatured', value)}
                  className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
                >
                  <Switch.Content>
                    <Label className="text-[13.5px] font-medium">Destacado en la portada</Label>
                    <Description>Aparece en la selección del inicio de la tienda.</Description>
                  </Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </Section>
              <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
          </Tabs.Panel>

          <Tabs.Panel id="fotos" className="p-0">
            {product && <PhotoManager productId={product.id} images={product.images} />}
          </Tabs.Panel>

          <Tabs.Panel id="historial" className="p-0">
            {product && <StockHistory productId={product.id} />}
          </Tabs.Panel>

          <Tabs.Panel id="qr" className="p-0">
            {product && (
              <PiecesPanel
                productId={product.id}
                sku={product.sku}
                name={product.content.es.name}
                stock={product.stock}
                isArchived={product.status === 'ARCHIVED'}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel id="google" className="p-0">
            <div className="flex flex-col gap-6">
              <Section title="Cómo se ve en Google" aside={langToggle}>
                <SearchPreview
                  url={`${STORE_HOST}${storePath[lang]}${content.slug || '…'}`}
                  title={content.metaTitle.trim() || content.name.trim() || 'Nombre del producto'}
                  description={
                    content.metaDescription.trim() ||
                    content.description.trim() ||
                    'Describe el producto en una o dos frases.'
                  }
                />
                <TextField
                  key={`${lang}-metaTitle`}
                  value={content.metaTitle}
                  onChange={(value) => setContent('metaTitle', value)}
                >
                  <Label>Título para Google</Label>
                  <Input
                    maxLength={80}
                    placeholder={content.name || 'Árbol de cuarzo rosa hecho a mano'}
                  />
                  <CharCount value={content.metaTitle} ideal={META_TITLE_IDEAL} />
                </TextField>
                <TextField
                  key={`${lang}-metaDescription`}
                  value={content.metaDescription}
                  onChange={(value) => setContent('metaDescription', value)}
                >
                  <Label>Descripción para Google</Label>
                  <TextArea rows={3} maxLength={200} />
                  <CharCount value={content.metaDescription} ideal={META_DESCRIPTION_IDEAL} />
                </TextField>
                <p className="panel-meta">
                  Opcional. Si los dejas vacíos se usan el nombre y la descripción. Incluye lo que
                  la gente busca: piedra, intención y “hecho a mano en Lima”.
                </p>
              </Section>
            </div>
          </Tabs.Panel>
        </Drawer.Body>
      </Tabs>

      <Drawer.Footer className="mt-0 justify-between gap-3 border-t border-border px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {product && product.status !== 'ARCHIVED' ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onPress={() => setConfirmArchive(true)}
            >
              Archivar
            </Button>
          ) : null}
          {product && (
            <span className="panel-meta hidden truncate sm:inline">
              {isDirty ? 'Cambios sin guardar' : `Actualizado ${formatDate(product.updatedAt)}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="tertiary" onPress={onClose}>
            {isDirty || !product ? 'Cancelar' : 'Cerrar'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            isPending={save.isPending}
            isDisabled={Boolean(product) && !isDirty}
            onPress={submit}
          >
            {product ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </Drawer.Footer>

      <CategoryDialog
        state={categoryDialog}
        categories={categories}
        onClose={() => setCategoryDialog(null)}
        onSaved={(saved) =>
          setState((current) => ({
            ...current,
            rootCategoryId: saved.parentId ?? saved.id,
            subcategoryId: saved.parentId ? saved.id : NO_SUBCATEGORY,
          }))
        }
      />
      <StockDialog target={stockTarget} onClose={() => setStockTarget(null)} />

      {product && (
        <ConfirmDialog
          isOpen={confirmArchive}
          onOpenChange={setConfirmArchive}
          title="¿Archivar este producto?"
          confirmLabel="Archivar"
          isPending={archive.isPending}
          onConfirm={() => archive.mutate()}
        >
          Dejará de mostrarse en la tienda. Los productos no se borran: puedes volver a publicarlo
          cambiando su estado.
        </ConfirmDialog>
      )}
    </>
  );
}
