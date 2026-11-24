/** Clienta que quiere hora un día sin horas libres (SPEC 21). */
export interface WaitlistEntry {
  id: string;
  professionalId: string;
  clientUserId: string;
  serviceVariantId: string;
  /** Día local de la profesional, `YYYY-MM-DD`. */
  date: string;
  createdAt: Date;
  notifiedAt: Date | null;
}

export interface NewWaitlistEntry {
  professionalId: string;
  clientUserId: string;
  serviceVariantId: string;
  date: string;
}

export const MAX_WAITLIST_ENTRIES_PER_CLIENT = 5;

export interface WaitlistRepository {
  /** Devuelve la entrada existente si la clienta ya esperaba ese día (una por día). */
  createOrGet(entry: NewWaitlistEntry): Promise<WaitlistEntry>;
  findById(id: string): Promise<WaitlistEntry | null>;
  delete(id: string): Promise<void>;
  /** Entradas desde `fromDate` inclusive, de una clienta en un negocio. */
  listByClient(professionalId: string, clientUserId: string, fromDate: string): Promise<WaitlistEntry[]>;
  /** Entradas desde `fromDate` inclusive, de todo el negocio, por día. */
  listByProfessional(professionalId: string, fromDate: string): Promise<WaitlistEntry[]>;
  /** Sin avisar todavía, de un día. */
  listUnnotified(professionalId: string, date: string): Promise<WaitlistEntry[]>;
  /** Marca el aviso solo si nadie lo marcó antes; `true` si esta llamada lo tomó. */
  claimNotification(id: string): Promise<boolean>;
}

/** Día local `YYYY-MM-DD` de un instante en una zona horaria. */
export function localDateIn(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    instant,
  );
}
