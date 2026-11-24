/** Paquete del catálogo: N sesiones de un servicio a un precio (SPEC 21). */
export interface ServicePackage {
  id: string;
  professionalId: string;
  serviceId: string;
  name: string;
  sessions: number;
  priceClp: number;
  active: boolean;
  createdAt: Date;
}

/** Paquete vendido: fotografía del catálogo al vender, más cuántas sesiones se usaron. */
export interface ClientPackage {
  id: string;
  professionalId: string;
  clientUserId: string;
  packageId: string | null;
  serviceId: string;
  name: string;
  sessionsTotal: number;
  sessionsUsed: number;
  priceClp: number;
  soldAt: Date;
}

export interface NewServicePackage {
  professionalId: string;
  serviceId: string;
  name: string;
  sessions: number;
  priceClp: number;
}

export interface NewClientPackage {
  professionalId: string;
  clientUserId: string;
  packageId: string;
  serviceId: string;
  name: string;
  sessionsTotal: number;
  priceClp: number;
}

export const MIN_PACKAGE_SESSIONS = 2;
export const MAX_PACKAGE_SESSIONS = 50;
export const MAX_PACKAGE_NAME = 80;

export function remainingSessions(pkg: ClientPackage): number {
  return Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed);
}

export interface PackageRepository {
  listPackages(professionalId: string): Promise<ServicePackage[]>;
  findPackage(id: string, professionalId: string): Promise<ServicePackage | null>;
  createPackage(pkg: NewServicePackage): Promise<ServicePackage>;
  setPackageActive(id: string, professionalId: string, active: boolean): Promise<ServicePackage | null>;
  listClientPackages(professionalId: string, clientUserId: string): Promise<ClientPackage[]>;
  findClientPackage(id: string, professionalId: string): Promise<ClientPackage | null>;
  sellPackage(pkg: NewClientPackage): Promise<ClientPackage>;
  /** Usa una sesión solo si quedan (escritura condicional). `false` si ya estaba agotado. */
  redeemSession(clientPackageId: string, bookingId: string | null): Promise<boolean>;
  /** Deshace la última sesión usada. `false` si no había ninguna. */
  undoLastRedemption(clientPackageId: string): Promise<boolean>;
}
