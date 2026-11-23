/**
 * CSV para Excel en español (SPEC 20): `;` como separador (la coma es el
 * separador decimal en es-CL) y BOM para que Excel lea UTF-8 y respete las
 * tildes.
 */
export type CsvCell = string | number | null | undefined;

const BOM = "﻿";

/**
 * Un nombre o una nota escritos por una clienta pueden empezar con `=`, `+`,
 * `-` o `@`: Excel los ejecutaría como fórmula. Un apóstrofo delante los deja
 * como texto. Los números reales no pasan por acá.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const text = neutralizeFormula(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return BOM + [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";
}
