import {
  Button,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  Switch,
  TextArea,
  TextField,
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
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { PhotoManager } from '../components/PhotoManager';
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

function toRequest(state: FormState): UpsertProductRequest | string {
  const priceCents = parsePriceToCents(state.price);
  if (priceCents === null || priceCents <= 0)
    return 'Escribe un precio válido, por ejemplo 289 o 289.50.';
  const stock = Number(state.stock);
  if (!Number.isInteger(stock) || stock < 0) return 'El stock debe ser un número entero (0 o más).';
  if (!state.categoryId) return 'Elige la intención del árbol.';
  const en = state.content.en;
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
    content: {
      es: state.content.es,
      en: en.name.trim() ? en : null,
    },
  };
}

export function ProductEditorPage() {
  const { id } = useParams();
  const product = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => api<AdminProductDto>('GET', ADMIN_CATALOG_ROUTES.product(id ?? '')),
    enabled: Boolean(id),
  });
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<AdminCategoryDto[]>('GET', ADMIN_CATALOG_ROUTES.categories),
    staleTime: 5 * 60_000,
  });

  if ((id && product.isPending) || categories.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner aria-label="Cargando" />
      </div>
    );
  }
  if (product.error || categories.error) {
    return (
      <ErrorNotice
        error={product.error ?? categories.error}
        title="No se pudo cargar el producto"
      />
    );
  }

  return (
    <ProductEditor
      key={product.data?.id ?? 'new'}
      product={product.data}
      categories={categories.data ?? []}
    />
  );
}

function ProductEditor({
  product,
  categories,
}: {
  product: AdminProductDto | undefined;
  categories: AdminCategoryDto[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<FormState>(() => initialState(product));
  const [clientError, setClientError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: UpsertProductRequest) =>
      product
        ? api<AdminProductDto>('PUT', ADMIN_CATALOG_ROUTES.product(product.id), body)
        : api<AdminProductDto>('POST', ADMIN_CATALOG_ROUTES.products, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSavedAt(saved.updatedAt);
      if (!product) void navigate(`/productos/${saved.id}`, { replace: true });
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      api<AdminProductDto>('POST', ADMIN_CATALOG_ROUTES.archiveProduct(product?.id ?? '')),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setState((current) => ({ ...current, status: saved.status }));
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  const setContent = (lang: Lang, field: keyof ProductContentDto, value: string) =>
    setState((current) => {
      const content = { ...current.content[lang], [field]: value };
      const slugEdited = { ...current.slugEdited };
      if (field === 'name' && !current.slugEdited[lang]) content.slug = slugify(value);
      if (field === 'slug') slugEdited[lang] = true;
      return { ...current, content: { ...current.content, [lang]: content }, slugEdited };
    });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = toRequest(state);
    if (typeof request === 'string') {
      setClientError(request);
      return;
    }
    setClientError(null);
    save.mutate(request);
  };

  const title = product ? product.content.es.name : 'Nuevo producto';

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-3">
        <Link to="/productos" className="text-[14px] text-text-secondary hover:text-text">
          ← Productos
        </Link>
        <p className="type-eyebrow">{product ? STATUS_LABELS[product.status] : 'Catálogo'}</p>
        <h1 className="type-h2">{title}</h1>
        <span className="accent-rule" />
        {product && (
          <p className="text-[13px] text-text-muted">
            SKU {product.sku} · actualizado {formatDate(savedAt ?? product.updatedAt)}
          </p>
        )}
      </div>

      <Form className="flex flex-col gap-12" onSubmit={onSubmit}>
        <section className="grid gap-8 lg:grid-cols-2">
          {(['es', 'en'] as const).map((lang) => (
            <fieldset key={lang} className="flex flex-col gap-5 border-t border-border pt-6">
              <legend className="type-h3 mb-2">
                {lang === 'es' ? 'Español' : 'English (opcional)'}
              </legend>
              <TextField
                isRequired={lang === 'es'}
                value={state.content[lang].name}
                onChange={(value) => setContent(lang, 'name', value)}
              >
                <Label>Nombre</Label>
                <Input className="h-11" maxLength={120} />
              </TextField>
              <TextField
                isRequired={lang === 'es' || Boolean(state.content.en.name.trim())}
                value={state.content[lang].slug}
                onChange={(value) => setContent(lang, 'slug', value)}
              >
                <Label>Slug (URL)</Label>
                <Input className="h-11" maxLength={140} />
                <Description>Minúsculas, números y guiones. Ej.: arbol-del-amor</Description>
              </TextField>
              <TextField
                value={state.content[lang].description}
                onChange={(value) => setContent(lang, 'description', value)}
              >
                <Label>Descripción</Label>
                <TextArea rows={5} maxLength={4000} />
              </TextField>
            </fieldset>
          ))}
        </section>

        <section className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="type-h3 sm:col-span-2 lg:col-span-3">Venta</h2>
          <TextField
            isRequired
            value={state.sku}
            onChange={(value) => set('sku', value.toUpperCase())}
          >
            <Label>SKU</Label>
            <Input className="h-11" maxLength={32} placeholder="ANT-AMOR-01" />
          </TextField>
          <Select
            isRequired
            placeholder="Elige una intención"
            selectedKey={state.categoryId || null}
            onSelectionChange={(key) => set('categoryId', String(key ?? ''))}
          >
            <Label>Intención</Label>
            <Select.Trigger className="h-11">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {categories.map((category) => (
                  <ListBox.Item key={category.id} id={category.id} textValue={category.name}>
                    {category.name}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <TextField isRequired value={state.price} onChange={(value) => set('price', value)}>
            <Label>Precio (S/)</Label>
            <Input className="h-11" inputMode="decimal" placeholder="289" />
            <Description>Soles peruanos. Sin descuentos visibles en la tienda.</Description>
          </TextField>
          <TextField
            isRequired
            type="number"
            value={state.stock}
            onChange={(value) => set('stock', value)}
          >
            <Label>Stock</Label>
            <Input className="h-11" min={0} step={1} />
          </TextField>
          <Select
            selectedKey={state.status}
            onSelectionChange={(key) => set('status', key as ProductStatusCode)}
          >
            <Label>Estado</Label>
            <Select.Trigger className="h-11">
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
            <Select.Trigger className="h-11">
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
            <Input className="h-11" maxLength={120} />
          </TextField>
          <Switch
            isSelected={state.isFeatured}
            onChange={(value) => set('isFeatured', value)}
            className="self-end pb-2"
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <Label>Destacado en la portada</Label>
            </Switch.Content>
          </Switch>
        </section>

        <div className="flex flex-col gap-4">
          {clientError && (
            <ErrorNotice error={new Error(clientError)} title="Revisa el formulario" />
          )}
          <ErrorNotice error={save.error} title="No se pudo guardar" />
          <ErrorNotice error={archive.error} title="No se pudo archivar" />
          {save.isSuccess && product && (
            <p role="status" className="text-[14px] text-sage">
              Cambios guardados.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-6">
            <Button
              type="submit"
              variant="primary"
              className="type-button h-12 px-10"
              isPending={save.isPending}
            >
              {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
            {product && product.status !== 'ARCHIVED' && (
              <Button
                variant="ghost"
                className="type-button"
                isPending={archive.isPending}
                onPress={() => archive.mutate()}
              >
                Archivar
              </Button>
            )}
          </div>
          {!product && (
            <p className="text-[13px] text-text-muted">
              Después de crearlo podrás subir las fotos.
            </p>
          )}
        </div>
      </Form>

      {product && <PhotoManager productId={product.id} images={product.images} />}
    </div>
  );
}
