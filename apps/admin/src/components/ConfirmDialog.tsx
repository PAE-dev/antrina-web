import { AlertDialog, Button } from '@heroui/react';
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  isPending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isKeyboardDismissDisabled={false}
    >
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={tone} />
            <AlertDialog.Heading className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="text-[13.5px] text-text-secondary">
            {children}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button size="sm" variant="tertiary" onPress={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button size="sm" variant="danger" isPending={isPending} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
