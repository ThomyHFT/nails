export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = timeZoneOffsetMinutes(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offsetMinutes * 60_000);
}

/**
 * Medianoche de `timeZone`, como instante UTC. Antes de esto, páginas del
 * admin calculaban "hoy" con `now.getFullYear()/getMonth()/getDate()`, que
 * leen la hora del runtime (UTC en Vercel) y no la de Chile: entre las 20:00
 * y las 23:59 en Santiago, esas páginas ya pensaban que era el día siguiente.
 */
export function startOfDayInZone(instant: Date, timeZone: string): Date {
  const dateInZone = new Intl.DateTimeFormat("en-CA", { timeZone }).format(instant);
  return zonedDateTimeToUtc(dateInZone, "00:00", timeZone);
}

export function utcToZonedMinutesOfDay(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return Number(map.hour) * 60 + Number(map.minute);
}
