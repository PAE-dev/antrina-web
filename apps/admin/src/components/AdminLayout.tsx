import { Button, Spinner } from '@heroui/react';
import { Logo } from '@antrina/ui';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { useCurrentAdmin, useLogout } from '../auth/session';
import { ErrorNotice } from './ErrorNotice';

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
      <div className="container-page section">
        <ErrorNotice error={me.error} title="No se pudo verificar la sesión" />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Logo href="/productos" label="Antrina · Panel" isCompact />
            <nav aria-label="Secciones" className="flex items-center gap-6">
              <NavLink
                to="/productos"
                className={({ isActive }) =>
                  `type-menu border-b py-1 ${isActive ? 'border-brand text-text' : 'border-transparent text-text-secondary hover:text-text'}`
                }
              >
                Productos
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[14px] text-text-secondary sm:inline">{me.data.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="type-button"
              isPending={logout.isPending}
              onPress={() =>
                logout.mutate(undefined, {
                  onSettled: () => void navigate('/login', { replace: true }),
                })
              }
            >
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="container-page py-10 md:py-14">
        <Outlet />
      </main>
    </div>
  );
}
