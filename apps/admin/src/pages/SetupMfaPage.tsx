import { Button, Form, Spinner } from '@heroui/react';
import {
  ADMIN_AUTH_ROUTES,
  type AdminMeDto,
  type AdminTotpCodeRequest,
  type AdminTotpSetupDto,
} from '@antrina/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ME_QUERY_KEY } from '../auth/session';
import { AuthCard } from '../components/AuthCard';
import { ErrorNotice } from '../components/ErrorNotice';
import { OtpField } from '../components/OtpField';
import { api, ApiError } from '../lib/api';

/** Primer acceso: vincular la app autenticadora es obligatorio antes de entrar al panel. */
export function SetupMfaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const requested = useRef(false);

  const setup = useMutation({
    mutationFn: () => api<AdminTotpSetupDto>('POST', ADMIN_AUTH_ROUTES.setupMfa),
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'auth.mfa_already_enabled') {
        void navigate('/login/verificar', { replace: true });
      }
    },
  });

  const confirm = useMutation({
    mutationFn: (body: AdminTotpCodeRequest) =>
      api<AdminMeDto>('POST', ADMIN_AUTH_ROUTES.confirmMfa, body),
    onSuccess: (me) => {
      queryClient.setQueryData(ME_QUERY_KEY, me);
      void navigate('/productos', { replace: true });
    },
    onError: () => setCode(''),
  });

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    setup.mutate();
  }, [setup]);

  const submit = (value: string) => {
    if (value.length === 6 && !confirm.isPending) confirm.mutate({ code: value });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(code);
  };

  return (
    <AuthCard eyebrow="Primer acceso" title="Protege tu cuenta">
      <ol className="type-body flex list-decimal flex-col gap-2 pl-5 text-[15px]">
        <li>Instala una app autenticadora (Google Authenticator, 1Password, Authy…).</li>
        <li>Escanea el código QR o escribe la clave manualmente.</li>
        <li>Introduce el código de 6 dígitos que te muestra la app.</li>
      </ol>

      {setup.isPending && (
        <div className="flex justify-center py-8">
          <Spinner aria-label="Generando código QR" />
        </div>
      )}
      <ErrorNotice error={setup.error} title="No se pudo generar el código QR" />
      {setup.error && (
        <Link to="/login" className="btn-secondary self-center">
          Volver a iniciar sesión
        </Link>
      )}

      {setup.data && (
        <>
          <div className="flex flex-col items-center gap-4">
            <img
              src={setup.data.qrDataUrl}
              alt="Código QR para la app autenticadora"
              width={200}
              height={200}
              className="rounded-sm border border-border bg-surface p-2"
            />
            <div className="flex w-full flex-col items-center gap-1 text-center">
              <span className="text-[13px] text-text-muted">Clave manual</span>
              <code className="break-all rounded-sm bg-bg-alt px-3 py-2 font-sans text-[14px] tracking-[0.12em] text-text">
                {setup.data.secret}
              </code>
            </div>
          </div>
          <Form className="flex flex-col items-center gap-5" onSubmit={onSubmit}>
            <OtpField
              value={code}
              onChange={setCode}
              onComplete={submit}
              isDisabled={confirm.isPending}
              isInvalid={confirm.isError}
            />
            <ErrorNotice error={confirm.error} title="Código no válido" />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="type-button h-12"
              isDisabled={code.length !== 6}
              isPending={confirm.isPending}
            >
              Activar y entrar
            </Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
