import { Button, Dropdown, Spinner, Toast, Tooltip } from '@heroui/react';
import { type AdminMeDto } from '@antrina/contracts';
import { type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { useCurrentAdmin, useLogout } from '../auth/session';
import { STORE_URL } from '../lib/api';
import { BrandMark } from './BrandMark';
import { ErrorNotice } from './ErrorNotice';
import { IconBox, IconExternal, IconImage, IconLogout } from './icons';

const ROLE_LABELS: Record<AdminMeDto['role'], string> = {
  OWNER: 'Propietario',
  EDITOR: 'Editor',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-brand">
      {initials(name)}
    </span>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors ${
          isActive ? 'bg-bg-alt text-text' : 'text-text-secondary hover:bg-bg hover:text-text'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

/** Rutas protegidas: exige sesión completa (contraseña + 2FA). */
export function AdminLayout() {
  const me = useCurrentAdmin();
  const logout = useLogout();
  const navigate = useNavigate();

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner aria-label="Cargando" />
      </div>
    );
  }
  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorNotice error={me.error} title="No se pudo verificar la sesión" />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace />;

  const admin = me.data;
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => void navigate('/login', { replace: true }) });

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center px-4">
          <BrandMark />
        </div>
        <nav aria-label="Secciones" className="flex flex-1 flex-col gap-6 px-3 pt-4">
          <div className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1.5 text-[12px] font-medium text-text-muted">Catálogo</p>
            <NavItem to="/productos" icon={<IconBox />}>
              Productos
            </NavItem>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1.5 text-[12px] font-medium text-text-muted">Contenido</p>
            <NavItem to="/portada" icon={<IconImage />}>
              Portada
            </NavItem>
          </div>
          {STORE_URL && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1.5 text-[12px] font-medium text-text-muted">Tienda</p>
              <a
                href={STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium text-text-secondary transition-colors hover:bg-bg hover:text-text"
              >
                <IconExternal />
                Ver tienda
              </a>
            </div>
          )}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-border p-3">
          <Avatar name={admin.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-text">{admin.name}</span>
            <span className="truncate text-[12px] text-text-muted">{ROLE_LABELS[admin.role]}</span>
          </div>
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Cerrar sesión"
              isPending={logout.isPending}
              onPress={signOut}
            >
              <IconLogout />
            </Button>
            <Tooltip.Content>Cerrar sesión</Tooltip.Content>
          </Tooltip>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <BrandMark />
        <Dropdown>
          <Dropdown.Trigger aria-label="Cuenta" className="rounded-full">
            <Avatar name={admin.name} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              aria-label="Cuenta"
              onAction={(key) => {
                if (key === 'products') void navigate('/productos');
                if (key === 'site') void navigate('/portada');
                if (key === 'store') window.open(STORE_URL, '_blank', 'noreferrer');
                if (key === 'logout') signOut();
              }}
            >
              <Dropdown.Item id="who" textValue={admin.email} isDisabled>
                <span className="text-[12px] text-text-muted">{admin.email}</span>
              </Dropdown.Item>
              <Dropdown.Item id="products" textValue="Productos">
                Productos
              </Dropdown.Item>
              <Dropdown.Item id="site" textValue="Portada">
                Portada
              </Dropdown.Item>
              {STORE_URL ? (
                <Dropdown.Item id="store" textValue="Ver tienda">
                  Ver tienda
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item id="logout" textValue="Cerrar sesión">
                Cerrar sesión
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
      <Toast.Provider placement="top" />
    </div>
  );
}
