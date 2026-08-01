export class ReviewBookingNotFoundError extends Error {
  constructor() {
    super("La reserva no existe");
    this.name = "ReviewBookingNotFoundError";
  }
}

export class BookingNotOwnedByClientError extends Error {
  constructor() {
    super("Esta reserva no pertenece a esta clienta");
    this.name = "BookingNotOwnedByClientError";
  }
}

export class BookingNotCompletedError extends Error {
  constructor() {
    super("Solo se puede opinar sobre una reserva completada");
    this.name = "BookingNotCompletedError";
  }
}

export class ReviewAlreadyExistsError extends Error {
  constructor() {
    super("Esta reserva ya tiene una opinión");
    this.name = "ReviewAlreadyExistsError";
  }
}

export class ReviewNotFoundError extends Error {
  constructor() {
    super("La opinión no existe");
    this.name = "ReviewNotFoundError";
  }
}

export class ReviewNotEditableError extends Error {
  constructor() {
    super("Una opinión moderada ya no se puede editar");
    this.name = "ReviewNotEditableError";
  }
}

export class InvalidRatingError extends Error {
  constructor() {
    super("La nota debe ser un número entero entre 1 y 5");
    this.name = "InvalidRatingError";
  }
}

export class InvalidReviewBodyError extends Error {
  constructor() {
    super("El texto debe tener entre 10 y 1000 caracteres");
    this.name = "InvalidReviewBodyError";
  }
}

export class InvalidInstagramHandleError extends Error {
  constructor() {
    super("El Instagram debe tener entre 1 y 30 caracteres, solo letras, números, punto y guion bajo");
    this.name = "InvalidInstagramHandleError";
  }
}
