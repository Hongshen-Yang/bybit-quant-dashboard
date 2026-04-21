import { bybitClient } from "../client";
import { BYBIT_ACCOUNT_TYPES, type BybitAccountType } from "../types";

export type BybitCoinBalance = {
  coin: string;
  transferBalance: string;
  walletBalance: string;
  bonus?: string;
};

export type AccountBalanceRow = {
  accountType: BybitAccountType;
  balances: BybitCoinBalance[];
};

export type BalanceDisplayItem = {
  key: string;
  text: string;
};

export type AccountBalanceSection = {
  accountType: BybitAccountType;
  count: number;
  items: BalanceDisplayItem[];
};

export type AllCoinsBalanceResult = {
  rows: AccountBalanceRow[];
  totalRows: number;
  sections: AccountBalanceSection[];
};

export type getAllCoinsBalanceResponse = {
  retCode: number;
  retMsg: string;
  result: {
    memberId: string;
    accountType: BybitAccountType;
    balance: BybitCoinBalance[];
  };
  retExtInfo: Record<string, unknown>;
  time: number;
};

function toBalanceDisplayText(balance: BybitCoinBalance): string {
  return `${balance.coin} - wallet: ${balance.walletBalance} - transfer: ${balance.transferBalance} - bonus: ${balance.bonus || "0"}`;
}

export async function getAllCoinsBalance(params?: {
  memberId?: string;
}): Promise<AllCoinsBalanceResult> {
  const memberId = params?.memberId ?? process.env.BYBIT_UID;

  const settledResults = await Promise.allSettled(
    BYBIT_ACCOUNT_TYPES.filter((accountType) => accountType !== "UNIFIED").map(async (accountType): Promise<AccountBalanceRow> => {
      const response = (await bybitClient.getAllCoinsBalance({
        memberId,
        accountType,
      })) as getAllCoinsBalanceResponse;

      return {
        accountType,
        balances: response.result?.balance ?? [],
      };
    })
  );

  const rows = settledResults.flatMap((result, index): AccountBalanceRow[] => {
    const accountType = BYBIT_ACCOUNT_TYPES[index];
    if (result.status !== "fulfilled") {
      console.warn(`getAllCoinsBalance failed for ${accountType}:`, result.reason);
      return [];
    }

    // console.log(`getAllCoinsBalance succeeded for ${accountType}: ${result.value.balances.length} coins`);
    return [result.value];
  });
  const totalRows = rows.reduce((sum, item) => sum + item.balances.length, 0);
  const sections = rows.map((row) => ({
    accountType: row.accountType,
    count: row.balances.length,
    items: row.balances.map((balance) => ({
      key: `${row.accountType}-${balance.coin}`,
      text: toBalanceDisplayText(balance),
    })),
  }));

  return {
    rows,
    totalRows,
    sections,
  };
}