export type UtcDateInput = Date | number | string;

export function formatUtcDateTime(input: UtcDateInput): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return `${date.toLocaleString("sv-SE", {
    timeZone: "UTC",
    hour12: false,
  })} UTC`;
}

export function toUtcIso(input?: UtcDateInput): string {
  if (typeof input === "undefined") {
    return new Date().toISOString();
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`);
  }

  return date.toISOString();
}
