import { Alert } from '@heroui/react';
import { errorMessage } from '../lib/api';

export function ErrorNotice({
  error,
  title = 'No se pudo completar',
}: {
  error: unknown;
  title?: string;
}) {
  if (!error) return null;
  return (
    <Alert status="danger" className="rounded-sm">
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{errorMessage(error)}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
