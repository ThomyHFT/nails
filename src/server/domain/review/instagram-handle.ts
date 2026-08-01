const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

export function normalizeInstagramHandle(input: string): string {
  return input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function isValidInstagramHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}
