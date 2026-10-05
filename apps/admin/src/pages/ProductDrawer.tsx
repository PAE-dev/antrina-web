import {
  Button,
  Description,
  Drawer,
  Input,
  InputGroup,
  Label,
  ListBox,
  Select,
  Skeleton,
  Switch,
  Tabs,
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
  type ProductContentDto,
  type ProductStatusCode,
  type UpsertProductRequest,
} from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { PhotoManager } from '../components/PhotoManager';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import {
  BADGE_LABELS,
  centsToInput,
  formatDate,
  parsePriceToCents,
  slugify,
  STATUS_LABELS,
} from '../lib/format';

type Lang = 'es' | 'en';
type Tab = 'detalles' | 'fotos';

const NEW_ID = 'nuevo';
const CLOSE_ANIMATION_MS = 220;
const STORE_PATH: Record<Lang, string> = { es: '/arbol/', en: '/en/tree/' };

interface FormState {
  sku: string;
  categoryId: string;
  price: string;
  stock: string;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | 'NONE';
  origin: string;
  content: Record<Lang, ProductContentDto>;
  /** Mientras no se edite a mano, el slug sigue al nombre. */
  slugEdited: Record<Lang, boolean>;
}

const EMPTY_CONTENT: ProductContentDto = { name: '', slug: '', description: '' };

function initialState(product?: AdminProductDto): FormState {
  if (!product) {
    return {
      sku: '',
      categoryId: '',
      price: '',
      stock: '1',
      status: 'DRAFT',
      isFeatured: false,
      badge: 'NONE',
      origin: 'Taller Antrina, Lima',
      content: { es: { ...EMPTY_CONTENT }, en: { ...EMPTY_CONTENT } },
      slugEdited: { es: false, en: false },
    };
  }
  return {
    sku: product.sku,
    categoryId: product.categoryId,
    price: centsToInput(product.price.amount),
    stock: String(product.stock),
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge ?? 'NONE',
    origin: product.origin ?? '',
    content: { es: { ...product.content.es }, en: { ...(product.content.en ?? EMPTY_CONTENT) } },
    slugEdited: { es: true, en: Boolean(product.content.en) },
  };
}

/** Lo que se compara para saber si hay cambios sin guardar. */
function snapshot({ slugEdited: _ignored, ...state }: FormState): string {
  return JSON.stringify(state);
}

function toRequest(state: FormState): UpsertProductRequest | string {
  const { es, en } = state.content;
  if (!es.name.trim()) return 'Escribe el nombre en español.';
  if (!es.slug.trim()) return 'Falta la URL en español.';
  if (en.name.trim() && !en.slug.trim()) return 'Falta la URL en inglés.';
  if (!state.sku.trim()) return 'Escribe el SKU.';
  const priceCents = parsePriceToCents(state.price);
  if (priceCents === null || priceCents <= 0)
    return 'Escribe un precio válido, por ejemplo 289 o 289.50.';
  const stock = Number(state.stock);
  if (!Number.isInteger(stock) || stock < 0) return 'El stock debe ser un número entero (0 o más).';
  if (!state.categoryId) return 'Elige la intención del árbol.';
  return {
    sku: state.sku.trim(),
    categoryId: state.categoryId,
    priceCents,
    currency: 'PEN',
    stock,
    status: state.status,
    isFeatured: state.isFeatured,
    badge: state.badge === 'NONE' ? null : state.badge,
    origin: state.origin.trim() || null,
    content: { es, en: en.name.trim() ? en : null },
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
            className="w-full max-w-full p-0 sm:w-[min(720px,100vw)]"
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
  const tab: Tab = product && searchParams.get('tab') === 'fotos' ? 'fotos' : 'detalles';
  const [state, setState] = useState<FormState>(() => initialState(product));
  const [baseline, setBaseline] = useState(() => snapshot(initialState(product)));
  const [lang, setLang] = useState<Lang>('es');
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const isDirty = snapshot(state) !== baseline;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const setTab = (next: Tab) =>
    setSearchParams(next === 'fotos' ? { tab: 'fotos' } : {}, { replace: true });

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

  const setContent = (field: keyof ProductContentDto, value: string) =>
    setState((current) => {
      const content = { ...current.content[lang], [field]: value };
      const slugEdited = { ...current.slugEdited };
      if (field === 'name' && !current.slugEdited[lang]) content.slug = slugify(value);
      if (field === 'slug') slugEdited[lang] = true;
      return { ...current, content: { ...current.content, [lang]: content }, slugEdited };
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

              <Section
                title="Contenido"
                aside={
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
                }
              >
                <TextField
                  key={`${lang}-name`}
                  isRequired={lang === 'es'}
                  value={content.name}
                  onChange={(value) => setContent('name', value)}
                >
                  <Label>Nombre</Label>
                  <Input
                    maxLength={120}
                    placeholder={lang === 'es' ? 'Árbol del amor' : 'Tree of love'}
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
                      {STORE_PATH[lang]}
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

              <Section title="Precio e inventario">
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    isRequired
                    value={state.price}
                    onChange={(value) => set('price', value)}
                  >
                    <Label>Precio</Label>
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
                    isRequired
                    type="number"
                    value={state.stock}
                    onChange={(value) => set('stock', value)}
                  >
                    <Label>Stock</Label>
                    <Input min={0} step={1} className="panel-num" />
                  </TextField>
                  <TextField
                    isRequired
                    value={state.sku}
                    onChange={(value) => set('sku', value.toUpperCase())}
                  >
                    <Label>SKU</Label>
                    <Input
                      maxLength={32}
                      placeholder="ANT-AMOR-01"
                      className="font-mono text-[13px]"
                    />
                  </TextField>
                </div>
                <p className="panel-meta">
                  Precio en soles. La tienda nunca muestra descuentos ni precios tachados.
                </p>
              </Section>

              <Section title="Organización">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    isRequired
                    placeholder="Elige una intención"
                    selectedKey={state.categoryId || null}
                    onSelectionChange={(key) => set('categoryId', String(key ?? ''))}
                  >
                    <Label>Intención</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {categories.map((category) => (
                          <ListBox.Item
                            key={category.id}
                            id={category.id}
                            textValue={category.name}
                          >
                            {category.name}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    selectedKey={state.status}
                    onSelectionChange={(key) => set('status', key as ProductStatusCode)}
                  >
                    <Label>Estado</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {(Object.keys(STATUS_LABELS) as ProductStatusCode[]).map((code) => (
                          <ListBox.Item key={code} id={code} textValue={STATUS_LABELS[code]}>
                            {STATUS_LABELS[code]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    selectedKey={state.badge}
                    onSelectionChange={(key) => set('badge', key as FormState['badge'])}
                  >
                    <Label>Etiqueta</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="NONE" textValue="Ninguna">
                          Ninguna
                        </ListBox.Item>
                        {(Object.keys(BADGE_LABELS) as ProductBadgeCode[]).map((code) => (
                          <ListBox.Item key={code} id={code} textValue={BADGE_LABELS[code]}>
                            {BADGE_LABELS[code]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <TextField value={state.origin} onChange={(value) => set('origin', value)}>
                    <Label>Origen</Label>
                    <Input maxLength={120} />
                  </TextField>
                </div>
                <Switch
                  isSelected={state.isFeatured}
                  onChange={(value) => set('isFeatured', value)}
                  className="flex w-full items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
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
