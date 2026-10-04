import { Button, Chip, Label, ListBox, SearchField, Select, Spinner } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminCategoryDto,
  type AdminProductListResponse,
  type ProductStatusCode,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { api } from '../lib/api';
import { formatDate, STATUS_LABELS } from '../lib/format';

const PAGE_SIZE = 20;
type StatusFilter = ProductStatusCode | 'ALL';

export function ProductsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'ALL') params.set('status', status);

  const products = useQuery({
    queryKey: ['admin', 'products', { query: query.trim(), status, page }],
    queryFn: () =>
      api<AdminProductListResponse>('GET', `${ADMIN_CATALOG_ROUTES.products}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<AdminCategoryDto[]>('GET', ADMIN_CATALOG_ROUTES.categories),
  });
  const categoryNames = new Map(categories.data?.map((c) => [c.slug, c.name]));

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="type-eyebrow">Catálogo</p>
          <h1 className="type-h2">Productos</h1>
          <span className="accent-rule" />
        </div>
        <Button
          variant="primary"
          className="type-button h-12 px-8"
          onPress={() => void navigate('/productos/nuevo')}
        >
          Nuevo producto
        </Button>
      </div>

      <div className="flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-end">
        <SearchField
          aria-label="Buscar por nombre o SKU"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="flex-1"
        >
          <Label>Buscar</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Nombre o SKU" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Select
          className="sm:w-56"
          selectedKey={status}
          onSelectionChange={(key) => {
            setStatus(key as StatusFilter);
            setPage(1);
          }}
        >
          <Label>Estado</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="ALL" textValue="Todos">
                Todos
              </ListBox.Item>
              {(Object.keys(STATUS_LABELS) as ProductStatusCode[]).map((code) => (
                <ListBox.Item key={code} id={code} textValue={STATUS_LABELS[code]}>
                  {STATUS_LABELS[code]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <ErrorNotice error={products.error} title="No se pudieron cargar los productos" />

      {products.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner aria-label="Cargando productos" />
        </div>
      ) : products.data && products.data.data.length === 0 ? (
        <p className="type-body py-16 text-center">
          {query || status !== 'ALL'
            ? 'Ningún producto coincide con la búsqueda.'
            : 'Aún no hay productos.'}
        </p>
      ) : (
        <ul className="flex flex-col">
          {products.data?.data.map((product) => (
            <li key={product.id} className="border-b border-border">
              <Link
                to={`/productos/${product.id}`}
                className="group grid grid-cols-[64px_1fr] items-center gap-4 py-4 sm:grid-cols-[64px_1fr_auto_auto] sm:gap-8"
              >
                <div className="aspect-[4/5] w-16 overflow-hidden rounded-sm bg-bg-alt">
                  {product.coverUrl ? (
                    <img
                      src={product.coverUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[11px] text-text-muted">
                      Sin foto
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="type-eyebrow text-[11px]">
                    {categoryNames.get(product.categorySlug) ?? product.categorySlug}
                  </span>
                  <span className="truncate font-display text-[20px] font-medium leading-tight text-text group-hover:text-brand">
                    {product.name}
                  </span>
                  <span className="text-[13px] text-text-muted">
                    {product.sku} · {product.imageCount}{' '}
                    {product.imageCount === 1 ? 'foto' : 'fotos'} · {formatDate(product.updatedAt)}
                  </span>
                </div>
                <div className="col-start-2 flex items-center gap-3 sm:col-start-auto">
                  <Chip
                    size="sm"
                    variant={product.status === 'ACTIVE' ? 'primary' : 'secondary'}
                    className="rounded-sm"
                  >
                    {STATUS_LABELS[product.status]}
                  </Chip>
                  {product.isFeatured && (
                    <span className="text-[13px] text-text-secondary">Destacado</span>
                  )}
                </div>
                <div className="col-start-2 flex flex-col sm:col-start-auto sm:items-end">
                  <span className="type-price">{formatMoney(product.price, 'es')}</span>
                  <span
                    className={`text-[13px] ${product.stock === 0 ? 'text-brand' : 'text-text-muted'}`}
                  >
                    {product.stock === 0 ? 'Sin stock' : `${product.stock} en stock`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {products.data && products.data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-[14px] text-text-secondary">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
