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
