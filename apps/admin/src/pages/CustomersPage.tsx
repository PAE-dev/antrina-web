import { Button, SearchField, Skeleton } from '@heroui/react';
import { ADMIN_SALES_ROUTES, type CustomerListResponse } from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconPlus, IconUsers } from '../components/icons';
import { Choice, EmptyState, PageHeader, Pagination } from '../components/PageKit';
import { api } from '../lib/api';
import { formatPhone, formatShortDate } from '../lib/format';

const PAGE_SIZE = 20;
const ALL_CUSTOMERS = 'all';
const WEB_ACCOUNTS = 'web';
const ORIGIN_OPTIONS = [
  { id: ALL_CUSTOMERS, label: 'Todos los clientes' },
  { id: WEB_ACCOUNTS, label: 'Registrados en la web' },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState(ALL_CUSTOMERS);
  const [page, setPage] = useState(1);
  const onlyWeb = origin === WEB_ACCOUNTS;

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (onlyWeb) params.set('webAccount', 'true');

  const customers = useQuery({
    queryKey: ['admin', 'customers', { query: query.trim(), origin, page }],
    queryFn: () =>
      api<CustomerListResponse>('GET', `${ADMIN_SALES_ROUTES.customers}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const rows = customers.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Quién te compra y cuánto. Se crean solos al registrar una venta con su teléfono o cuando alguien se registra en la tienda."
        actions={
          <Button variant="primary" onPress={() => void navigate('/clientes/nuevo')}>
            <IconPlus />
            Nuevo cliente
          </Button>
        }
      />

      <div className="panel-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center">
          <SearchField
            aria-label="Buscar cliente"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            className="md:w-80"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Nombre, teléfono o correo" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <Choice
            ariaLabel="Filtrar clientes"
            value={origin}
            options={ORIGIN_OPTIONS}
            onChange={(value) => {
              setOrigin(value);
              setPage(1);
            }}
            className="md:w-56"
          />
        </div>
        {customers.error ? (
          <div className="p-4">
            <ErrorNotice error={customers.error} title="No se pudieron cargar los clientes" />
          </div>
        ) : customers.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={18} />}
            title={
              query.trim()
                ? 'Sin resultados'
                : onlyWeb
                  ? 'Todavía no hay registrados'
                  : 'Todavía no hay clientes'
            }
            description={
              query.trim()
                ? 'Prueba con otro nombre o teléfono.'
                : onlyWeb
                  ? 'Aparecerán aquí cuando alguien cree su cuenta en la tienda.'
                  : 'Aparecerán aquí cuando registres ventas o alguien se registre en la tienda.'
            }
          />
        ) : (
          <ul
            className={`divide-y divide-border ${customers.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {rows.map((customer) => (
              <li key={customer.id}>
                <Link
                  to={`/clientes/${customer.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-text">
                        {customer.name}
                      </span>
                      {customer.hasWebAccount && (
                        <span className="inline-flex h-5 shrink-0 items-center rounded-md bg-bg-alt px-1.5 text-[11.5px] font-medium text-text-secondary">
                          Web
                        </span>
                      )}
                    </span>
                    <span className="panel-meta truncate">
                      {customer.phone
                        ? formatPhone(customer.phone)
                        : (customer.email ?? 'Sin teléfono')}
                    </span>
                    {customer.hasWebAccount && (
                      <span className="panel-meta sm:hidden">
                        Registro {formatShortDate(customer.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="panel-meta hidden flex-col items-end sm:flex">
                    {customer.hasWebAccount && (
                      <span>Registro {formatShortDate(customer.createdAt)}</span>
                    )}
                    <span>
                      {customer.lastOrderAt
                        ? `Última compra ${formatShortDate(customer.lastOrderAt)}`
                        : 'Sin compras'}
                    </span>
                  </div>
                  <div className="flex w-24 shrink-0 flex-col items-end">
                    <span className="panel-num text-[13.5px] font-medium text-text">
                      {formatMoney(customer.totalSpent, 'es')}
                    </span>
                    <span className="panel-meta panel-num">
                      {customer.orderCount} {customer.orderCount === 1 ? 'compra' : 'compras'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={customers.data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>

      <Outlet />
    </div>
  );
}
