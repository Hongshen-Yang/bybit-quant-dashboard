export const BYBIT_ACCOUNT_TYPES = [
  "FUND",
  "UNIFIED",
  "SPOT",
  "CONTRACT",
  "OPTION",
  "INVESTMENT",
] as const;

export type BybitAccountType = (typeof BYBIT_ACCOUNT_TYPES)[number];