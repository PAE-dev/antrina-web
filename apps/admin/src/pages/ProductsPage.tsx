import { Button, SearchField, Skeleton, Tabs } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminCategoryDto,
  type AdminProductListResponse,
  type ProductStatusCode,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import {
  IconBox,
  IconChevronLeft,
  IconChevronRight,
  IconImage,
  IconPlus,
  IconStar,
} from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
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

const TH = 'h-10 px-4 text-left text-[12px] font-medium text-text-muted';

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
    staleTime: 5 * 60_000,
  });
  const categoryNames = new Map(categories.data?.map((c) => [c.slug, c.name]));

  const total = products.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = products.data?.data ?? [];
  const isFiltered = Boolean(query.trim()) || status !== 'ALL';
  const open = (id: string) => void navigate(`/productos/${id}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="panel-title">Productos</h1>
          <p className="text-[13.5px] text-text-secondary">
            Árboles del catálogo, su precio, stock y fotos.
          </p>
        </div>
        <Button variant="primary" size="md" onPress={() => open('nuevo')}>
          <IconPlus />
          Nuevo producto
        </Button>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
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
          <SearchField
            aria-label="Buscar por nombre o SKU"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            className="md:w-72"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar por nombre o SKU" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
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
                  ? 'Prueba con otro nombre, SKU o estado.'
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
                      <span className="panel-num text-[13.5px] font-medium text-text">
                        {formatMoney(product.price, 'es')}
                      </span>
                      <span
                        className={`panel-num text-[12px] ${product.stock === 0 ? 'font-medium text-danger' : 'text-text-muted'}`}
                      >
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
                      Intención
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
                      Actualizado
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
                        {categoryNames.get(product.categorySlug) ?? product.categorySlug}
                      </td>
                      <td className="px-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="panel-num hidden px-4 text-right text-[13px] sm:table-cell">
                        {product.stock === 0 ? (
                          <span className="font-medium text-danger">Agotado</span>
                        ) : (
                          <span className="text-text-secondary">{product.stock}</span>
                        )}
                      </td>
                      <td className="panel-num whitespace-nowrap px-4 text-right text-[13.5px] font-medium text-text">
                        {formatMoney(product.price, 'es')}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 text-[13px] text-text-muted lg:table-cell">
                        {formatShortDate(product.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5">
            <span className="panel-num text-[12.5px] text-text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Página anterior"
                  isDisabled={page <= 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <IconChevronLeft />
                </Button>
                <span className="panel-num px-1 text-[12.5px] text-text-secondary">
                  {page} / {totalPages}
                </span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Página siguiente"
                  isDisabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <IconChevronRight />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Outlet />
    </div>
  );
}
