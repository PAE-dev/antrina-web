import { type Locale, type Localized, pickLocalized } from '../shared/locale.js';

export interface CategoryProps {
  id: string;
  slug: string;
  name: Localized<string>;
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

  nameFor(locale: Locale): string {
    return pickLocalized(this.props.name, locale);
  }
}
