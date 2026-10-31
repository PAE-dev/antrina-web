import { Button, SearchField, Skeleton, Tabs, Tooltip } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminCategoryDto,
  type AdminProductListItemDto,
  type AdminProductListResponse,
  type AdminStockFilterCode,
  type ProductStatusCode,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconBox, IconImage, IconPlus, IconReceipt, IconStar } from '../components/icons';
import { Choice, Pagination, TH } from '../components/PageKit';
import { StatusBadge } from '../components/StatusBadge';
import { StockDialog, type StockTarget } from '../components/StockDialog';
import { api } from '../lib/api';
import { formatShortDate } from '../lib/format';

const PAGE_SIZE = 20;
type StatusFilter = ProductStatusCode | 'ALL';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ACTIVE', label: 'Publicados' },
  { id: 'DRAFT', label: 'Borradores' },
  { id: 'ARCHIVED', label: 'Archivados' },
];

const ALL = 'ALL';

function ProductPrice({ product }: { product: AdminProductListItemDto }) {
  return (
    <span className="flex flex-col items-end">
      <span className="panel-num whitespace-nowrap text-[13.5px] font-medium text-text">
        {formatMoney(product.price, 'es')}
      </span>
      {product.compareAtPrice && (
        <span className="panel-num whitespace-nowrap text-[12px] text-text-muted line-through">
          {formatMoney(product.compareAtPrice, 'es')}
        </span>
      )}
    </span>
  );
}

function stockTone(product: AdminProductListItemDto): string {
  if (product.stock === 0) return 'font-medium text-danger';
  if (product.isLowStock) return 'font-medium text-warning';
  return 'text-text-secondary';
}

export function ProductsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [stock, setStock] = useState<AdminStockFilterCode | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [stockTarget, setStockTarget] = useState<StockTarget | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('categoria') ?? ALL;
  const setCategory = (value: string) => {
    setSearchParams(value === ALL ? {} : { categoria: value }, { replace: true });
    setPage(1);
  };

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'ALL') params.set('status', status);
  if (categoryId !== ALL) params.set('categoryId', categoryId);
  if (stock !== ALL) params.set('stock', stock);

  const products = useQuery({
    queryKey: ['admin', 'products', { query: query.trim(), status, categoryId, stock, page }],
    queryFn: () =>
      api<AdminProductListResponse>('GET', `${ADMIN_CATALOG_ROUTES.products}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<AdminCategoryDto[]>('GET', ADMIN_CATALOG_ROUTES.categories),
    staleTime: 5 * 60_000,
  });
  const allCategories = categories.data ?? [];
  const categoryById = new Map(allCategories.map((category) => [category.id, category]));
  /** "Velas › Aromáticas" para las subcategorías. */
  const categoryLabel = (id: string) => {
    const category = categoryById.get(id);
    if (!category) return '';
    const parent = category.parentId ? categoryById.get(category.parentId) : undefined;
    return parent ? `${parent.name} › ${category.name}` : category.name;
  };
  const categoryOptions = [
    { id: ALL, label: 'Todas las categorías' },
    ...allCategories
      .filter((category) => !category.parentId)
      .flatMap((root) => [
        { id: root.id, label: root.name },
        ...allCategories
          .filter((child) => child.parentId === root.id)
          .map((child) => ({ id: child.id, label: child.name, indent: true })),
      ]),
  ];

  const total = products.data?.total ?? 0;
  const rows = products.data?.data ?? [];
  const isFiltered =
    Boolean(query.trim()) || status !== 'ALL' || categoryId !== ALL || stock !== ALL;
  const open = (id: string) => void navigate(`/productos/${id}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="panel-title">Productos</h1>
          <p className="text-[13.5px] text-text-secondary">
            Todo tu catálogo: categoría, precio, oferta, stock y fotos.
          </p>
        </div>
        <Button variant="primary" size="md" onPress={() => open('nuevo')}>
          <IconPlus />
          Nuevo producto
        </Button>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <Tabs
            selectedKey={status}
            onSelectionChange={(key) => {
              setStatus(key as StatusFilter);
              setPage(1);
            }}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Filtrar por estado">
                {FILTERS.map((filter) => (
                  <Tabs.Tab key={filter.id} id={filter.id} className="px-3 text-[13px]">
                    {filter.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchField
              aria-label="Buscar por nombre o SKU"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              className="flex-1"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar por nombre o SKU" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Choice
              ariaLabel="Filtrar por categoría"
              value={categoryId}
              onChange={setCategory}
              options={categoryOptions}
              className="md:w-56"
            />
            <Choice
              ariaLabel="Filtrar por existencias"
              value={stock}
              onChange={(value) => {
                setStock(value as typeof stock);
                setPage(1);
              }}
              options={[
                { id: ALL, label: 'Cualquier stock' },
                { id: 'low', label: 'Stock bajo' },
                { id: 'out', label: 'Agotados' },
              ]}
              className="md:w-44"
            />
          </div>
        </div>

        {products.error ? (
          <div className="p-4">
            <ErrorNotice error={products.error} title="No se pudieron cargar los productos" />
          </div>
        ) : products.isPending ? (
          <ul aria-label="Cargando productos" className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-[45px] w-9 rounded-sm" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-48 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
                <Skeleton className="h-3.5 w-16 rounded-sm" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-md bg-bg-alt text-text-secondary">
              <IconBox size={18} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="panel-heading">
                {isFiltered ? 'Sin resultados' : 'Todavía no hay productos'}
              </p>
              <p className="text-[13px] text-text-muted">
                {isFiltered
                  ? 'Prueba con otro nombre, categoría o filtro.'
                  : 'Crea el primero y súbele fotos.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul
              className={`divide-y divide-border sm:hidden ${products.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {rows.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/productos/${product.id}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-bg"
                  >
                    <div className="flex h-[50px] w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-bg-alt text-text-muted">
                      {product.coverUrl ? (
                        <img
                          src={product.coverUrl}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <IconImage size={14} />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-[13.5px] font-medium text-text">
                        {product.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={product.status} />
                        <span className="truncate font-mono text-[11.5px] text-text-muted">
                          {product.sku}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <ProductPrice product={product} />
                      <span className={`panel-num text-[12px] ${stockTone(product)}`}>
                        {product.stock === 0 ? 'Agotado' : `${product.stock} en stock`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse">
                <thead className="bg-bg">
                  <tr className="border-b border-border">
                    <th scope="col" className={TH}>
                      Producto
                    </th>
                    <th scope="col" className={`${TH} hidden md:table-cell`}>
                      Categoría
                    </th>
                    <th scope="col" className={TH}>
                      Estado
                    </th>
                    <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
                      Stock
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Precio
                    </th>
                    <th scope="col" className={`${TH} hidden lg:table-cell`}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-border ${products.isPlaceholderData ? 'opacity-60' : ''}`}
                >
                  {rows.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => open(product.id)}
                      className="cursor-pointer transition-colors hover:bg-bg"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-[45px] w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-bg-alt text-text-muted">
                            {product.coverUrl ? (
                              <img
                                src={product.coverUrl}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            ) : (
                              <IconImage size={14} />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-1.5">
                              <Link
                                to={`/productos/${product.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className="truncate text-[13.5px] font-medium text-text hover:underline"
                              >
                                {product.name}
                              </Link>
                              {product.isFeatured && (
                                <span title="Destacado" className="shrink-0 text-warning">
                                  <IconStar size={13} />
                                  <span className="sr-only">Destacado</span>
                                </span>
                              )}
                            </span>
                            <span className="truncate font-mono text-[12px] text-text-muted">
                              {product.sku}
                              <span className="font-sans">
                                {' · '}
                                {product.imageCount} {product.imageCount === 1 ? 'foto' : 'fotos'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 text-[13px] text-text-secondary md:table-cell">
                        {categoryLabel(product.categoryId)}
                      </td>
                      <td className="px-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="panel-num hidden px-4 text-right text-[13px] sm:table-cell">
                        <button
                          type="button"
                          title="Cambiar stock"
                          onClick={(event) => {
                            event.stopPropagation();
                            setStockTarget({
                              id: product.id,
                              name: product.name,
                              stock: product.stock,
                            });
                          }}
                          className={`rounded-sm px-2 py-1 transition-colors hover:bg-bg-alt ${stockTone(product)}`}
                        >
                          {product.stock === 0 ? 'Agotado' : product.stock}
                        </button>
                      </td>
                      <td className="px-4 text-right">
                        <ProductPrice product={product} />
                      </td>
                      <td
                        className="hidden px-2 lg:table-cell"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <span className="whitespace-nowrap text-[12px] text-text-muted">
                            {formatShortDate(product.updatedAt)}
                          </span>
                          <Tooltip delay={300}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label={`Registrar venta de ${product.name}`}
                              isDisabled={product.stock === 0}
                              onPress={() => void navigate(`/ventas/nueva?producto=${product.id}`)}
                            >
                              <IconReceipt />
                            </Button>
                            <Tooltip.Content>Vender</Tooltip.Content>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <StockDialog target={stockTarget} onClose={() => setStockTarget(null)} />

      <Outlet />
    </div>
  );
}
