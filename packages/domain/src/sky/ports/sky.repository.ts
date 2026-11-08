import { type SkyBond, type SkyProfile, type SkyQuestion, type SkyTopic } from '../sky-profile.js';

export interface SkyProfileInput {
  birthDate: string;
  birthTime: string | null;
  place: SkyProfile['place'];
}

/** "Tu cielo" guardado en la cuenta del cliente (Customer con sesión de Google). */
export interface SkyRepository {
  getProfile(customerId: string): Promise<SkyProfile | null>;
  saveProfile(customerId: string, input: SkyProfileInput): Promise<SkyProfile>;
  /** Borra perfil, preguntas y vínculos. */
  deleteAll(customerId: string): Promise<void>;
  listQuestions(customerId: string, limit: number): Promise<SkyQuestion[]>;
  /** Guarda la pregunta (reemplaza una igual) y conserva solo las `keep` más recientes. */
  addQuestion(
    customerId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ): Promise<SkyQuestion>;
  listBonds(customerId: string): Promise<SkyBond[]>;
  countBonds(customerId: string): Promise<number>;
  addBond(customerId: string, input: { name: string; birthDate: string }): Promise<SkyBond>;
  /** Devuelve false si el vínculo no existe o es de otro cliente. */
  deleteBond(customerId: string, bondId: string): Promise<boolean>;
}
