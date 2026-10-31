import { Button, Skeleton } from '@heroui/react';
import {
  ADMIN_USERS_ROUTES,
  type AdminUserDto,
  type AdminUserListResponse,
} from '@antrina/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from 'react-router';
import { useCurrentAdmin } from '../auth/session';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconPlus } from '../components/icons';
import { PageHeader } from '../components/PageKit';
import { api } from '../lib/api';
import { ADMIN_ROLE_LABELS, formatShortDate } from '../lib/format';

function UserState({ user }: { user: AdminUserDto }) {
  const isLocked = user.lockedUntil !== null && new Date(user.lockedUntil) > new Date();
  const [label, tone] = !user.isActive
    ? ['Desactivado', 'bg-bg-alt text-text-secondary']
    : isLocked
      ? ['Bloqueado', 'bg-warning-tint text-warning']
      : ['Activo', 'bg-success-tint text-success'];
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

export function UsersPage() {
  const navigate = useNavigate();
  const me = useCurrentAdmin();
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api<AdminUserListResponse>('GET', ADMIN_USERS_ROUTES.users),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Quién puede entrar al panel y qué puede hacer."
        actions={
          <Button variant="primary" onPress={() => void navigate('/usuarios/nuevo')}>
            <IconPlus />
            Nuevo usuario
          </Button>
        }
      />

      <div className="panel-card overflow-hidden">
        {users.error ? (
          <div className="p-4">
            <ErrorNotice error={users.error} title="No se pudieron cargar los usuarios" />
          </div>
        ) : users.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {users.data.data.map((user) => (
              <li key={user.id}>
                <Link
                  to={`/usuarios/${user.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium text-text">
                      {user.name}
                      {user.id === me.data?.id ? ' (tú)' : ''}
                    </span>
                    <span className="panel-meta truncate">{user.email}</span>
                  </div>
                  <span className="panel-meta hidden md:inline">
                    {user.lastLoginAt
                      ? `Último ingreso ${formatShortDate(user.lastLoginAt)}`
                      : 'Nunca ha entrado'}
                  </span>
                  <span className="hidden w-24 text-[13px] text-text-secondary sm:inline">
                    {ADMIN_ROLE_LABELS[user.role]}
                  </span>
                  <UserState user={user} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Outlet />
    </div>
  );
}
