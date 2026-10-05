import { Button, Form, Input, Label, TextField } from '@heroui/react';
import {
  ADMIN_AUTH_ROUTES,
  type AdminLoginRequest,
  type AdminLoginResponse,
} from '@antrina/contracts';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useCurrentAdmin } from '../auth/session';
import { AuthCard } from '../components/AuthCard';
import { ErrorNotice } from '../components/ErrorNotice';
import { api } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const me = useCurrentAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: (body: AdminLoginRequest) =>
      api<AdminLoginResponse>('POST', ADMIN_AUTH_ROUTES.login, body),
    onSuccess: (result) => {
      setPassword('');
      void navigate(result.status === 'MFA_REQUIRED' ? '/login/verificar' : '/configurar-2fa');
    },
  });

  if (me.data) return <Navigate to="/productos" replace />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthCard title="Inicia sesión" description="Panel de administración de Antrina.">
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <TextField
          name="email"
          type="email"
          autoComplete="username"
          isRequired
          value={email}
          onChange={setEmail}
        >
          <Label>Correo</Label>
          <Input />
        </TextField>
        <TextField
          name="password"
          type="password"
          autoComplete="current-password"
          isRequired
          value={password}
          onChange={setPassword}
        >
          <Label>Contraseña</Label>
          <Input />
        </TextField>
        <ErrorNotice error={login.error} title="No pudimos iniciar sesión" />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          className="mt-1"
          isPending={login.isPending}
        >
          Continuar
        </Button>
      </Form>
    </AuthCard>
  );
}
