/** Datos que hay que recordar entre la ida a Google y la vuelta. */
export interface GoogleAuthorization {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface GoogleIdentity {
  /** Identificador estable de la cuenta de Google (`sub`); el correo puede cambiar. */
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface GoogleIdentityProvider {
  /** Falso mientras no estén configuradas las credenciales de Google. */
  isEnabled(): boolean;
  createAuthorization(): GoogleAuthorization;
  /** Canjea el código por la identidad, ya validada; lanza `auth.google_failed` si no es válida. */
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<GoogleIdentity>;
}
