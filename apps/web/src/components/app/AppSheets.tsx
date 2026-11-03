import { Button, Input, Label, TextField } from '@heroui/react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';

const SCAN_INTERVAL_MS = 220;
const QR_PATH = /\/q\/([^/?#]+)/;

/** Acepta el código impreso o la URL completa del QR. Una URL de otra cosa no es una pieza. */
export function codeFromText(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const inUrl = QR_PATH.exec(value);
  if (inUrl) return decodeURIComponent(inUrl[1]!);
  return /^[\p{L}\p{N}_-]+$/u.test(value) ? value : null;
}

const pieceUrl = (code: string) => `/q/${encodeURIComponent(code)}`;

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="app-sheet-layer">
      <button type="button" className="app-sheet-scrim" aria-label="Cerrar" onClick={onClose} />
      <section className="app-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="app-sheet-head">
          <h2 className="font-display">{title}</h2>
          <button type="button" className="app-sheet-close" aria-label="Cerrar" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

type CameraState = 'starting' | 'live' | 'blocked';

/** Abre la cámara y busca un QR. Sin cámara o sin permiso, queda escribir el código. */
export function ScanSheet({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = (text: string): boolean => {
    const found = codeFromText(text);
    if (!found) {
      setError('Ese no parece un QR de Antrina. Revisa la etiqueta de tu pieza.');
      return false;
    }
    window.location.assign(pieceUrl(found));
    return true;
  };
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    let isActive = true;
    let stream: MediaStream | null = null;
    let timer = 0;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('blocked');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        if (isActive) setCamera('blocked');
        return;
      }
      const video = videoRef.current;
      if (!isActive || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setCamera('live');
      const { default: jsQR } = await import('jsqr');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const scan = () => {
        if (!isActive || !context) return;
        if (video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height, {
            inversionAttempts: 'dontInvert',
          });
          if (result?.data && openRef.current(result.data)) return;
        }
        timer = window.setTimeout(scan, SCAN_INTERVAL_MS);
      };
      scan();
    };
    void start();

    return () => {
      isActive = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    open(code);
  };

  return (
    <Sheet title="Escanea tu pieza" onClose={onClose}>
      <div className="app-scanner">
        <video ref={videoRef} muted playsInline aria-label="Vista de la cámara" />
        {camera === 'live' && <span className="app-scanner-frame" aria-hidden="true" />}
        {camera !== 'live' && (
          <p className="app-scanner-note">
            {camera === 'starting'
              ? 'Abriendo la cámara…'
              : 'No pudimos abrir la cámara. Escribe el código de tu etiqueta.'}
          </p>
        )}
      </div>
      <p className="app-sheet-text">
        Apunta al QR de tu pieza. Cada código abre una sola puerta y queda unido a tu cuenta.
      </p>
      <form className="app-code-form" onSubmit={submit} noValidate>
        <TextField
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          className="flex-1"
        >
          <Label className="app-sheet-label">O escribe el código</Label>
          <Input
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Está debajo del QR"
            className="text-[16px]"
          />
        </TextField>
        <Button type="submit" className="h-11 bg-on-dark px-5 text-[15px] font-medium text-text">
          Abrir
        </Button>
      </form>
      {error && (
        <p role="alert" className="app-sheet-error">
          {error}
        </p>
      )}
    </Sheet>
  );
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

/** Instalar: Android lo pide el navegador; en iPhone solo se puede desde el menú Compartir. */
export function InstallRow({ asRow = false }: { asRow?: boolean }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showsHelp, setShowsHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const remember = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', remember);
    return () => window.removeEventListener('beforeinstallprompt', remember);
  }, []);

  if (isInstalled) return null;
  return (
    <>
      <button
        type="button"
        className={asRow ? 'profile-link' : 'app-sheet-link'}
        onClick={() => {
          if (prompt) void prompt.prompt();
          else setShowsHelp(true);
        }}
      >
        Agregar a mi pantalla de inicio
      </button>
      {showsHelp && (
        <p className="app-sheet-text">
          En iPhone toca Compartir y luego “Agregar a inicio”. En Android, abre el menú del
          navegador y elige “Instalar app”.
        </p>
      )}
    </>
  );
}
