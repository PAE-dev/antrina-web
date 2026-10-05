import { Button, Form } from '@heroui/react';
import { ADMIN_AUTH_ROUTES, type AdminMeDto, type AdminTotpCodeRequest } from '@antrina/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ME_QUERY_KEY } from '../auth/session';
import { AuthCard } from '../components/AuthCard';
import { ErrorNotice } from '../components/ErrorNotice';
import { OtpField } from '../components/OtpField';
import { api, ApiError } from '../lib/api';

export function VerifyMfaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const verify = useMutation({
    mutationFn: (body: AdminTotpCodeRequest) =>
      api<AdminMeDto>('POST', ADMIN_AUTH_ROUTES.verifyMfa, body),
    onSuccess: (me) => {
      queryClient.setQueryData(ME_QUERY_KEY, me);
      void navigate('/productos', { replace: true });
    },
    onError: (error) => {
      setCode('');
      if (error instanceof ApiError && error.code === 'auth.mfa_setup_required') {
        void navigate('/configurar-2fa', { replace: true });
      }
    },
  });

  const submit = (value: string) => {
    if (value.length === 6 && !verify.isPending) verify.mutate({ code: value });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(code);
  };
  const sessionLost =
    verify.error instanceof ApiError &&
    ['auth.unauthorized', 'auth.locked'].includes(verify.error.code);

  return (
    <AuthCard
      title="Verificación en dos pasos"
      description="Escribe el código de Antrina que muestra tu app autenticadora."
    >
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <OtpField
          value={code}
          onChange={setCode}
          onComplete={submit}
          isDisabled={verify.isPending}
          isInvalid={verify.isError}
        />
        <ErrorNotice error={verify.error} title="Código no válido" />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={code.length !== 6}
          isPending={verify.isPending}
        >
          Entrar al panel
        </Button>
      </Form>
      <Link to="/login" className="self-center text-[13px] text-text-secondary hover:text-text">
        {sessionLost ? 'Volver a iniciar sesión' : 'Usar otra cuenta'}
      </Link>
    </AuthCard>
  );
}
