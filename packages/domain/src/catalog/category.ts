import { DomainError } from '../shared/domain-error.js';
import {
  DEFAULT_LOCALE,
  type Locale,
  type Localized,
  pickLocalized,
  SUPPORTED_LOCALES,
} from '../shared/locale.js';

export interface CategoryContent {
  name: string;
  slug: string;
  description: string | null;
}

export interface CategoryProps {
  id: string;
  /** Slug en español: identifica la categoría en los filtros de la API. */
  slug: string;
  content: Localized<CategoryContent>;
  parentId: string | null;
  sortOrder: number;
}

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): string {
    return this.props.id;
  }

  get slug(): string {
    return this.props.slug;
  }

  get parentId(): string | null {
    return this.props.parentId;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get content(): Localized<CategoryContent> {
    return this.props.content;
  }

  /** Locales con traducción propia (no fallback). */
  get locales(): Locale[] {
    return (Object.keys(this.props.content) as Locale[]).filter((l) => this.props.content[l]);
  }

  contentFor(locale: Locale): CategoryContent {
    return pickLocalized(this.props.content, locale);
  }

  nameFor(locale: Locale): string {
    return this.contentFor(locale).name;
  }
}

/** Datos editables de una categoría desde el panel. */
export interface CategoryDraft {
  parentId: string | null;
  sortOrder: number;
  content: Localized<CategoryContent>;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function invalid(message: string, field: string): never {
  throw new DomainError(message, `category.invalid_${field}`);
}

export function validateCategoryDraft(draft: CategoryDraft): CategoryDraft {
  if (!Number.isInteger(draft.sortOrder) || draft.sortOrder < 0) invalid('Orden inválido', 'order');
  for (const locale of SUPPORTED_LOCALES) {
    const content = draft.content[locale];
    if (!content) {
      if (locale === DEFAULT_LOCALE) invalid('Falta el nombre en español', 'content');
      continue;
    }
    if (content.name.length === 0 || content.name.length > 80) {
      invalid(`El nombre (${locale}) es obligatorio y tiene máximo 80 caracteres`, 'name');
    }
    if (!SLUG_PATTERN.test(content.slug) || content.slug.length > 90) {
      invalid(`La URL (${locale}) solo admite minúsculas, números y guiones`, 'slug');
    }
    if (content.description !== null && content.description.length > 600) {
      invalid(`La descripción (${locale}) tiene máximo 600 caracteres`, 'description');
    }
  }
  return draft;
}
