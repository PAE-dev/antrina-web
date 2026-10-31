import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { ADMIN_USERS_ROUTES, type ChangeOwnPasswordRequest } from '@antrina/contracts';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useCurrentAdmin } from '../auth/session';
import { ErrorNotice } from '../components/ErrorNotice';
import { PageHeader } from '../components/PageKit';
import { api } from '../lib/api';
import { ADMIN_ROLE_LABELS } from '../lib/format';

export function AccountPage() {
  const me = useCurrentAdmin();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeated, setRepeated] = useState('');

  const change = useMutation({
    mutationFn: (body: ChangeOwnPasswordRequest) =>
      api<void>('PUT', ADMIN_USERS_ROUTES.ownPassword, body),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setRepeated('');
      toast.success('Contraseña actualizada. Se cerraron tus otras sesiones.');
    },
  });

  const mismatch = repeated.length > 0 && repeated !== newPassword;
  const canSubmit = currentPassword && newPassword && repeated === newPassword;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) change.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi cuenta" description="Tus datos de acceso al panel." />

      {me.data && (
        <dl className="panel-card flex max-w-xl flex-col divide-y divide-border">
          {[
            ['Nombre', me.data.name],
            ['Correo', me.data.email],
            ['Rol', ADMIN_ROLE_LABELS[me.data.role]],
          ].map(([term, detail]) => (
            <div key={term} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-[13px] text-text-muted">{term}</dt>
              <dd className="min-w-0 truncate text-[13.5px] font-medium text-text">{detail}</dd>
            </div>
          ))}
        </dl>
      )}

      <form onSubmit={submit} className="panel-card flex max-w-xl flex-col gap-4 p-4">
        <h2 className="panel-heading">Cambiar contraseña</h2>
        <ErrorNotice error={change.error} title="No se pudo cambiar la contraseña" />
        <TextField isRequired type="password" value={currentPassword} onChange={setCurrentPassword}>
          <Label>Contraseña actual</Label>
          <Input autoComplete="current-password" maxLength={200} />
        </TextField>
        <TextField isRequired type="password" value={newPassword} onChange={setNewPassword}>
          <Label>Contraseña nueva</Label>
          <Input autoComplete="new-password" maxLength={200} />
        </TextField>
        <TextField
          isRequired
          type="password"
          value={repeated}
          onChange={setRepeated}
          isInvalid={mismatch}
        >
          <Label>Repite la contraseña nueva</Label>
          <Input autoComplete="new-password" maxLength={200} />
        </TextField>
        {mismatch && <p className="text-[12.5px] text-danger">Las contraseñas no coinciden.</p>}
        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="self-start"
          isPending={change.isPending}
          isDisabled={!canSubmit}
        >
          Cambiar contraseña
        </Button>
      </form>
    </div>
  );
}
