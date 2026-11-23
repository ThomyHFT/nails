/** Nota privada de la profesional sobre una clienta (SPEC 20). */
export interface ClientNote {
  professionalId: string;
  clientUserId: string;
  body: string;
  updatedAt: Date;
}

export const CLIENT_NOTE_MAX_LENGTH = 2000;

export interface ClientNotesRepository {
  find(professionalId: string, clientUserId: string): Promise<ClientNote | null>;
  /** Crea o reemplaza la nota del par profesional-clienta. */
  upsert(professionalId: string, clientUserId: string, body: string): Promise<ClientNote>;
}
