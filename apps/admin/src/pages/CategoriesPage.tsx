import { Button, Skeleton, toast } from '@heroui/react';
import { ADMIN_CATALOG_ROUTES, type AdminCategoryDto } from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { CategoryDialog, type CategoryDialogState } from '../components/CategoryDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconPencil, IconPlus, IconTag, IconTrash } from '../components/icons';
import { EmptyState, PageHeader } from '../components/PageKit';
import { api } from '../lib/api';

function Row({
  category,
  isChild,
  onEdit,
  onAddChild,
  onDelete,
}: {
  category: AdminCategoryDto;
  isChild?: boolean;
  onEdit: () => void;
  onAddChild?: () => void;
  onDelete: () => void;
}) {
  const canDelete = category.productCount === 0 && category.childCount === 0;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
      <div
        className={`flex min-w-0 flex-1 flex-col ${isChild ? 'border-l border-border pl-4' : ''}`}
      >
        <span className="truncate text-[13.5px] font-medium text-text">{category.name}</span>
        <span className="truncate font-mono text-[12px] text-text-muted">
          /categoria/{category.content.es.slug}
        </span>
      </div>
      <Link
        to={`/productos?categoria=${category.id}`}
        className="panel-num whitespace-nowrap text-[13px] text-text-secondary hover:underline"
      >
        {category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}
      </Link>
      <div className="flex items-center gap-1">
        {onAddChild && (
          <Button size="sm" variant="ghost" onPress={onAddChild}>
            <IconPlus size={14} />
            Subcategoría
          </Button>
        )}
        <Button isIconOnly size="sm" variant="ghost" aria-label="Editar" onPress={onEdit}>
          <IconPencil />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={canDelete ? 'Eliminar' : 'Eliminar: primero debe quedar vacía'}
          isDisabled={!canDelete}
          onPress={onDelete}
        >
          <IconTrash />
        </Button>
      </div>
    </li>
  );
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategoryDto | null>(null);

  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<AdminCategoryDto[]>('GET', ADMIN_CATALOG_ROUTES.categories),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<void>('DELETE', ADMIN_CATALOG_ROUTES.category(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Categoría eliminada');
      setToDelete(null);
    },
  });

  const all = categories.data ?? [];
  const roots = all.filter((category) => !category.parentId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        description="Organiza tus productos: cada categoría puede tener subcategorías. Las que tienen productos publicados aparecen en la tienda."
        actions={
          <Button variant="primary" onPress={() => setDialog({})}>
            <IconPlus />
            Nueva categoría
          </Button>
        }
      />

      <div className="panel-card overflow-hidden">
        {categories.error ? (
          <div className="p-4">
            <ErrorNotice error={categories.error} title="No se pudieron cargar las categorías" />
          </div>
        ) : categories.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : roots.length === 0 ? (
          <EmptyState
            icon={<IconTag size={18} />}
            title="Todavía no hay categorías"
            description="Crea la primera para empezar a organizar tus productos."
          />
        ) : (
          <ul className="divide-y divide-border">
            {roots.map((root) => (
              <li key={root.id}>
                <ul className="divide-y divide-border">
                  <Row
                    category={root}
                    onEdit={() => setDialog({ category: root })}
                    onAddChild={() => setDialog({ parentId: root.id })}
                    onDelete={() => setToDelete(root)}
                  />
                  {all
                    .filter((child) => child.parentId === root.id)
                    .map((child) => (
                      <Row
                        key={child.id}
                        category={child}
                        isChild
                        onEdit={() => setDialog({ category: child })}
                        onDelete={() => setToDelete(child)}
                      />
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CategoryDialog state={dialog} categories={all} onClose={() => setDialog(null)} />
      <ConfirmDialog
        isOpen={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name ?? 'la categoría'}?`}
        confirmLabel="Eliminar"
        isPending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      >
        Está vacía, así que ningún producto se verá afectado.
        <ErrorNotice error={remove.error} title="No se pudo eliminar" />
      </ConfirmDialog>
    </div>
  );
}
