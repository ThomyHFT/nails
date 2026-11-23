export interface TokenGenerator {
  generateToken(): string;
  hashToken(token: string): string;
  /** Código numérico de 6 dígitos para entrar por correo (SPEC 20). */
  generateCode(): string;
}
