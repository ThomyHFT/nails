/**
 * Integrante del equipo de un negocio (SPEC 22). Todo negocio tiene una, la
 * dueña; con plan Salón puede tener más. Horario, bloqueos y reservas son de
 * una integrante.
 */
export interface StaffMember {
  id: string;
  professionalId: string;
  /** Usuario con acceso al panel de equipo. `null` = sin acceso propio. */
  userId: string | null;
  name: string;
  isOwner: boolean;
  active: boolean;
  /** `false` = solo los servicios de `serviceIds`. */
  allServices: boolean;
  serviceIds: string[];
  sortOrder: number;
  createdAt: Date;
}

export type Plan = "solo" | "salon";

export const SALON_MIN_STAFF = 2;
export const SALON_MAX_STAFF = 6;
export const MAX_STAFF_NAME = 60;

export function doesService(staff: StaffMember, serviceId: string): boolean {
  return staff.allServices || staff.serviceIds.includes(serviceId);
}

/** Las que pueden atender un servicio, en el orden del equipo: la prioridad de "sin preferencia". */
export function staffForService(team: StaffMember[], serviceId: string): StaffMember[] {
  return team
    .filter((staff) => staff.active && doesService(staff, serviceId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
}

export interface NewStaffMember {
  professionalId: string;
  name: string;
  userId?: string | null;
  isOwner?: boolean;
  sortOrder?: number;
}

export interface StaffPatch {
  name?: string;
  active?: boolean;
  allServices?: boolean;
  userId?: string | null;
}

export interface StaffRepository {
  listByProfessional(professionalId: string): Promise<StaffMember[]>;
  findById(id: string, professionalId: string): Promise<StaffMember | null>;
  findByUserId(userId: string): Promise<StaffMember | null>;
  findOwner(professionalId: string): Promise<StaffMember | null>;
  create(staff: NewStaffMember): Promise<StaffMember>;
  update(id: string, professionalId: string, patch: StaffPatch): Promise<StaffMember | null>;
  /** Reemplaza la lista de servicios de una integrante. */
  setServices(id: string, serviceIds: string[]): Promise<void>;
}
