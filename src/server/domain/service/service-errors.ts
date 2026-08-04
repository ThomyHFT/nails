export class ServiceHasBookingsError extends Error {
  constructor() {
    super("No se puede eliminar: el servicio tiene reservas asociadas. Desactívalo en su lugar.");
    this.name = "ServiceHasBookingsError";
  }
}

export class VariantHasBookingsError extends Error {
  constructor() {
    super("No se puede eliminar: la variante tiene reservas asociadas. Desactívala en su lugar.");
    this.name = "VariantHasBookingsError";
  }
}

/**
 * Artefacto transicional de SPEC 13 fase 2: mientras `nail_length` siga
 * escribiéndose por debajo (paso 3 del expand/contract), cada variante
 * nueva ocupa uno de los 4 valores del enum legado para no violar su
 * índice único. Un quinto variante por servicio no cabe hasta el paso 4,
 * que dropea la columna. El límite ya existía antes de este spec —el enum
 * de 4 valores era la única opción visible—, solo que ahora es invisible.
 */
export class VariantLimitDuringMigrationError extends Error {
  constructor() {
    super("Este servicio ya tiene el máximo de variantes por ahora");
    this.name = "VariantLimitDuringMigrationError";
  }
}
