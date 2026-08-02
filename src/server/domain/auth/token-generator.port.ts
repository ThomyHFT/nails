export interface TokenGenerator {
  generateToken(): string;
  hashToken(token: string): string;
}
