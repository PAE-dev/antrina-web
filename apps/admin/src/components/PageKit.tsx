import { Button, Label, ListBox, Select } from '@heroui/react';
import { type ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from './icons';

/** Cabecera de tabla compartida por las listas del panel. */
export const TH = 'h-10 px-4 text-left text-[12px] font-medium text-text-muted';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="panel-title">{title}</h1>
        <p className="text-[13.5px] text-text-secondary">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-md bg-bg-alt text-text-secondary">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <p className="panel-heading">{title}</p>
        <p className="max-w-sm text-[13px] text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5">
      <span className="panel-num text-[12.5px] text-text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Página anterior"
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
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
            onPress={() => onPageChange(page + 1)}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** Sangría para las subcategorías. */
  indent?: boolean;
}

/** Select de HeroUI con su etiqueta visible (o solo `ariaLabel` en barras de filtros). */
export function Choice({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  placeholder,
  isRequired,
  isDisabled,
  className,
}: {
  label?: string;
  ariaLabel?: string;
  value: string | null;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      isRequired={isRequired}
      isDisabled={isDisabled}
      placeholder={placeholder}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key ?? ''))}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              <span className={option.indent ? 'pl-3' : undefined}>{option.label}</span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'danger' | 'warning';
}) {
  const valueTone =
    tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-text';
  return (
    <div className="panel-card flex flex-col gap-1 p-4">
      <span className="text-[12.5px] font-medium text-text-muted">{label}</span>
      <span className={`panel-num text-[24px] font-semibold tracking-[-0.02em] ${valueTone}`}>
        {value}
      </span>
      {hint && <span className="panel-meta">{hint}</span>}
    </div>
  );
}
