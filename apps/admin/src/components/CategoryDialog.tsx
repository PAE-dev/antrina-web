import {
  Button,
  Description,
  Input,
  InputGroup,
  Label,
  Modal,
  TextArea,
  TextField,
} from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminCategoryDto,
  type UpsertCategoryRequest,
} from '@antrina/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { slugify } from '../lib/format';
import { ErrorNotice } from './ErrorNotice';
import { Choice } from './PageKit';

const NO_PARENT = 'NONE';

export interface CategoryDialogState {
  /** Categoría a editar; sin ella se crea una nueva. */
  category?: AdminCategoryDto;
  /** Categoría superior preseleccionada al crear una subcategoría. */
  parentId?: string | null;
}

export function CategoryDialog({
  state,
  categories,
  onClose,
  onSaved,
}: {
  state: CategoryDialogState | null;
  categories: AdminCategoryDto[];
  onClose: () => void;
  onSaved?: (category: AdminCategoryDto) => void;
}) {
  return (
    <Modal.Backdrop isOpen={state !== null} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog aria-label="Categoría">
          {state && (
            <CategoryForm
              key={state.category?.id ?? `new-${state.parentId ?? ''}`}
              state={state}
              categories={categories}
              onClose={onClose}
              onSaved={onSaved}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function CategoryForm({
  state,
  categories,
  onClose,
  onSaved,
}: {
  state: CategoryDialogState;
  categories: AdminCategoryDto[];
  onClose: () => void;
  onSaved?: (category: AdminCategoryDto) => void;
}) {
  const queryClient = useQueryClient();
  const { category } = state;
  const [parentId, setParentId] = useState(category?.parentId ?? state.parentId ?? NO_PARENT);
  const [name, setName] = useState(category?.content.es.name ?? '');
  const [slug, setSlug] = useState(category?.content.es.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(category));
  const [description, setDescription] = useState(category?.content.es.description ?? '');
  const [nameEn, setNameEn] = useState(category?.content.en?.name ?? '');
  const [slugEn, setSlugEn] = useState(category?.content.en?.slug ?? '');
  const [slugEnEdited, setSlugEnEdited] = useState(Boolean(category?.content.en));
  const [clientError, setClientError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: UpsertCategoryRequest) =>
      category
        ? api<AdminCategoryDto>('PUT', ADMIN_CATALOG_ROUTES.category(category.id), body)
        : api<AdminCategoryDto>('POST', ADMIN_CATALOG_ROUTES.categories, body),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      onSaved?.(saved);
      onClose();
    },
  });

  // Solo hay dos niveles: el padre debe ser principal, y no puede serlo una con subcategorías.
  const parents = categories.filter((item) => !item.parentId && item.id !== category?.id);
  const canHaveParent = !category || category.childCount === 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setClientError('Escribe el nombre de la categoría.');
      return;
    }
    if (nameEn.trim() && !slugEn.trim()) {
      setClientError('Falta la URL en inglés.');
      return;
    }
    setClientError(null);
    save.mutate({
      parentId: parentId === NO_PARENT ? null : parentId,
      sortOrder: category?.sortOrder ?? categories.length,
      content: {
        es: { name: name.trim(), slug: slug.trim(), description: description.trim() || null },
        en: nameEn.trim()
          ? {
              name: nameEn.trim(),
              slug: slugEn.trim(),
              description: category?.content.en?.description ?? null,
            }
          : null,
      },
    });
  };

  return (
    <>
      <Modal.Header>
        <Modal.Heading className="text-[15px] font-semibold tracking-[-0.01em]">
          {category ? `Editar ${category.name}` : 'Nueva categoría'}
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <form id="category-form" className="flex flex-col gap-4 p-0.5" onSubmit={submit} noValidate>
          <TextField
            isRequired
            autoFocus
            value={name}
            onChange={(value) => {
              setName(value);
              if (!slugEdited) setSlug(slugify(value));
            }}
          >
            <Label>Nombre</Label>
            <Input maxLength={80} placeholder="Velas, Pulseras, Decoración…" />
          </TextField>
          <Choice
            label="Va dentro de"
            value={parentId}
            isDisabled={!canHaveParent}
            onChange={setParentId}
            options={[
              { id: NO_PARENT, label: 'Nada: es una categoría principal' },
              ...parents.map((item) => ({ id: item.id, label: item.name })),
            ]}
          />
          {!canHaveParent && (
            <p className="panel-meta -mt-2">
              Tiene subcategorías, así que debe seguir siendo principal.
            </p>
          )}
          <TextField
            isRequired
            value={slug}
            onChange={(value) => {
              setSlugEdited(true);
              setSlug(value);
            }}
          >
            <Label>URL</Label>
            <InputGroup>
              <InputGroup.Prefix className="font-mono text-[12px] text-text-muted">
                /categoria/
              </InputGroup.Prefix>
              <InputGroup.Input maxLength={90} className="font-mono text-[13px]" />
            </InputGroup>
            <Description>Se genera desde el nombre.</Description>
          </TextField>
          <TextField value={description} onChange={setDescription}>
            <Label>Descripción (opcional)</Label>
            <TextArea rows={2} maxLength={600} />
            <Description>Se muestra arriba en la página de la categoría.</Description>
          </TextField>
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <TextField
              value={nameEn}
              onChange={(value) => {
                setNameEn(value);
                if (!slugEnEdited) setSlugEn(slugify(value));
              }}
            >
              <Label>Nombre en inglés (opcional)</Label>
              <Input maxLength={80} placeholder="Candles" />
            </TextField>
            <TextField
              value={slugEn}
              onChange={(value) => {
                setSlugEnEdited(true);
                setSlugEn(value);
              }}
            >
              <Label>URL en inglés</Label>
              <Input maxLength={90} className="font-mono text-[13px]" placeholder="candles" />
            </TextField>
          </div>
          {clientError && (
            <ErrorNotice error={new Error(clientError)} title="Revisa el formulario" />
          )}
          <ErrorNotice error={save.error} title="No se pudo guardar" />
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="tertiary" onPress={onClose}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" isPending={save.isPending} onPress={() => submit()}>
          {category ? 'Guardar' : 'Crear categoría'}
        </Button>
      </Modal.Footer>
    </>
  );
}
