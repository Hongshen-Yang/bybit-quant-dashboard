// We need both getWalletBalance and getAllCoinsBalance because we removed UNIFIED from getAllCoinsBalance.
// In getAllCoinsBalance the coin parameter becomes mandatory when accountType=UNIFIED.
// https://bybit-exchange.github.io/docs/v5/asset/balance/all-balance

import type { WalletBalanceRow } from "@/lib/bybit/account/get-wallet-balance";
import type { AccountBalanceRow } from "@/lib/bybit/asset/get-all-coins-balance";
import type { BybitAccountType } from "@/lib/bybit/types";

export type TickerLike = {
  symbol: string;
  lastPrice: string;
};

export type AccountCoinBalances = Map<BybitAccountType, Map<string, number>>;

export type AccountValue = {
  usdt: number;
  btc: number;
};

export function buildUsdtRateMap(tickerItems: Array<TickerLike>): Map<string, number> {
  const usdtRateByCoin = new Map<string, number>();

  usdtRateByCoin.set("USDT", 1);
  usdtRateByCoin.set("USDC", 1);

  tickerItems.forEach((ticker) => {
    if (!ticker.symbol.endsWith("USDT")) {
      return;
    }

    const coin = ticker.symbol.slice(0, -4);
    const rate = Number(ticker.lastPrice);
    if (!coin || Number.isNaN(rate) || rate <= 0) {
      return;
    }

    usdtRateByCoin.set(coin, rate);
  });

  return usdtRateByCoin;
}

export function aggregateHoldingsQuantityBySymbol(params: {
  unifiedRows: WalletBalanceRow[];
  allCoinsRows: AccountBalanceRow[];
}): Map<string, number> {
  const quantityBySymbol = new Map<string, number>();

  params.unifiedRows.forEach((row) => {
    row.coins.forEach((coin) => {
      const quantity = Number(coin.walletBalance);
      if (Number.isNaN(quantity)) return;
      quantityBySymbol.set(coin.coin, (quantityBySymbol.get(coin.coin) ?? 0) + quantity);
    });
  });

  params.allCoinsRows.forEach((row) => {
    row.balances.forEach((balance) => {
      const quantity = Number(balance.walletBalance);
      if (Number.isNaN(quantity)) return;
      quantityBySymbol.set(balance.coin, (quantityBySymbol.get(balance.coin) ?? 0) + quantity);
    });
  });

  return quantityBySymbol;
}

export function buildAccountCoinBalances(params: {
  unifiedRows: WalletBalanceRow[];
  allCoinsRows: AccountBalanceRow[];
}): AccountCoinBalances {
  const accountCoinBalances = new Map<BybitAccountType, Map<string, number>>();

  params.unifiedRows.forEach((row) => {
    const balances = accountCoinBalances.get(row.accountType) ?? new Map<string, number>();

    row.coins.forEach((coin) => {
      const amount = Number(coin.walletBalance);
      if (Number.isNaN(amount)) {
        return;
      }

      balances.set(coin.coin, (balances.get(coin.coin) ?? 0) + amount);
    });

    accountCoinBalances.set(row.accountType, balances);
  });

  params.allCoinsRows.forEach((row) => {
    const balances = accountCoinBalances.get(row.accountType) ?? new Map<string, number>();

    row.balances.forEach((coin) => {
      const amount = Number(coin.walletBalance);
      if (Number.isNaN(amount)) {
        return;
      }

      balances.set(coin.coin, (balances.get(coin.coin) ?? 0) + amount);
    });

    accountCoinBalances.set(row.accountType, balances);
  });

  return accountCoinBalances;
}

export function buildAccountValues(params: {
  accountCoinBalances: AccountCoinBalances;
  usdtRateByCoin: Map<string, number>;
}): Map<BybitAccountType, AccountValue> {
  const btcUsdtRate = params.usdtRateByCoin.get("BTC") ?? 0;
  const accountValues = new Map<BybitAccountType, AccountValue>();

  params.accountCoinBalances.forEach((coinBalances, accountType) => {
    let totalUsdt = 0;

    coinBalances.forEach((amount, coin) => {
      const usdtRate = params.usdtRateByCoin.get(coin);
      if (!usdtRate) {
        return;
      }

      totalUsdt += amount * usdtRate;
    });

    accountValues.set(accountType, {
      usdt: totalUsdt,
      btc: btcUsdtRate > 0 ? totalUsdt / btcUsdtRate : 0,
    });
  });

  return accountValues;
}