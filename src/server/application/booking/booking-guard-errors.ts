export class BookingNotFoundError extends Error {
  constructor() {
    super("Reserva no encontrada");
    this.name = "BookingNotFoundError";
  }
}

export class BookingNotOwnedError extends Error {
  constructor() {
    super("Esta reserva no pertenece a esta profesional");
    this.name = "BookingNotOwnedError";
  }
}

export class BookingTooEarlyError extends Error {
  constructor() {
    super("No se puede marcar la reserva antes de que termine la cita");
    this.name = "BookingTooEarlyError";
  }
}
