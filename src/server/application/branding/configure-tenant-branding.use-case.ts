import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import { FONT_PAIR_FAMILIES } from "@/server/domain/branding/brand-tokens";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

const COLOR_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class InvalidColorHexError extends Error {
  constructor(field: string) {
    super(`${field} debe tener formato #RRGGBB`);
    this.name = "InvalidColorHexError";
  }
}

export class InvalidImageUrlError extends Error {
  constructor(field: string) {
    super(`${field} debe empezar con https://`);
    this.name = "InvalidImageUrlError";
  }
}

export class InvalidArchetypeError extends Error {
  constructor() {
    super("El arquetipo no existe");
    this.name = "InvalidArchetypeError";
  }
}

export class InvalidFontPairError extends Error {
  constructor() {
    super("El par tipográfico no existe");
    this.name = "InvalidFontPairError";
  }
}

export interface ConfigureTenantBrandingInput {
  professionalId: string;
  archetype: BrandArchetype;
  primaryColorHex: string | null;
  onPrimaryColorHex: string | null;
  fontPair: BrandFontPair | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

function assertColorHex(field: string, value: string | null): void {
  if (value !== null && !COLOR_HEX_PATTERN.test(value)) {
    throw new InvalidColorHexError(field);
  }
}

function assertHttpsUrl(field: string, value: string | null): void {
  if (value !== null && !value.startsWith("https://")) {
    throw new InvalidImageUrlError(field);
  }
}

export class ConfigureTenantBrandingUseCase {
  constructor(private readonly brandingRepository: BrandingRepository) {}

  async execute(input: ConfigureTenantBrandingInput): Promise<TenantBranding> {
    if (!(input.archetype in BRAND_ARCHETYPES)) {
      throw new InvalidArchetypeError();
    }
    if (input.fontPair !== null && !(input.fontPair in FONT_PAIR_FAMILIES)) {
      throw new InvalidFontPairError();
    }
    assertColorHex("primary_color_hex", input.primaryColorHex);
    assertColorHex("on_primary_color_hex", input.onPrimaryColorHex);
    assertHttpsUrl("logo_url", input.logoUrl);
    assertHttpsUrl("cover_image_url", input.coverImageUrl);

    return this.brandingRepository.upsert(input);
  }
}
