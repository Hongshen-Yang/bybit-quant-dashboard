import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getSpotTickers } from "@/lib/bybit/market/get-tickers";
import { hasBybitCredentials } from "@/lib/bybit/client";
import { getSupabaseAnonClient } from "@/lib/supabase/client";
import {
  aggregateHoldingsQuantityBySymbol,
  buildAccountCoinBalances,
  buildAccountValues,
  buildUsdtRateMap,
} from "@/lib/utils/portfolio-calculations";
import { type BybitAccountType } from "@/lib/bybit/types";
import { PortfolioHistoryChart, type PortfolioHistoryPoint } from "./PortfolioHistoryChart";

type PortfolioItem = {
  key: string;
  text: string;
};

type PortfolioCoinView = {
  coin: string;
  walletBalance: string;
  equity: string;
  availableToWithdraw: string;
  unrealisedPnl: string;
  usdValue: number;
};

type PortfolioValuesRpcRow = {
  recorded_at?: string | null;
  recordedAt?: string | null;
  timestamp?: string | null;
  portfolio_value_usd?: number | string | null;
  value_usd?: number | string | null;
  valueUsd?: number | string | null;
  portfolio_value?: number | string | null;
  total_value?: number | string | null;
  value?: number | string | null;
};

type PortfolioHoldingRow = {
  recorded_at: string;
  symbol: string;
  quantity: number | string;
};

function formatAccountType(accountType: BybitAccountType): string {
  switch (accountType) {
    case "UNIFIED":
      return "Unified Trading";
    case "FUND":
      return "Funding";
    case "SPOT":
      return "Spot";
    case "CONTRACT":
      return "Contract";
    case "OPTION":
      return "Option";
    case "INVESTMENT":
      return "Investment";
    default:
      return accountType;
  }
}

function toFixedValue(value: number, digits: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function toNumber(value: string | number): number {
  return Number(value);
}

function toRecordedAt(row: PortfolioValuesRpcRow): string | null {
  if (typeof row.recorded_at === "string" && row.recorded_at.length > 0) return row.recorded_at;
  if (typeof row.recordedAt === "string" && row.recordedAt.length > 0) return row.recordedAt;
  if (typeof row.timestamp === "string" && row.timestamp.length > 0) return row.timestamp;

  return null;
}

function toValueUsd(row: PortfolioValuesRpcRow): number {
  const candidates = [
    row.portfolio_value_usd,
    row.value_usd,
    row.valueUsd,
    row.portfolio_value,
    row.total_value,
    row.value,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }

    const parsed = Number(candidate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toPortfolioHistory(data: PortfolioValuesRpcRow[] | null): PortfolioHistoryPoint[] {
  if (!data) {
    return [];
  }

  return data
    .map((row) => {
      const recordedAt = toRecordedAt(row);
      if (!recordedAt) {
        return null;
      }

      return {
        recordedAt,
        valueUsd: toValueUsd(row),
      };
    })
    .filter((point): point is PortfolioHistoryPoint => point !== null)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

function toRecordedAtKey(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toISOString();
}

function withHoldings(
  portfolioHistory: PortfolioHistoryPoint[],
  holdingsRows: PortfolioHoldingRow[]
): PortfolioHistoryPoint[] {
  const holdingsByRecordedAt = new Map<
    string,
    Array<{
      symbol: string;
      quantity: number;
    }>
  >();

  holdingsRows.forEach((row) => {
    const key = toRecordedAtKey(row.recorded_at);
    const quantity = Number(row.quantity);

    if (Number.isNaN(quantity)) {
      return;
    }

    const existing = holdingsByRecordedAt.get(key) ?? [];
    existing.push({ symbol: row.symbol, quantity });
    holdingsByRecordedAt.set(key, existing);
  });

  return portfolioHistory.map((point) => ({
    ...point,
    holdings: holdingsByRecordedAt.get(toRecordedAtKey(point.recordedAt)) ?? [],
  }));
}

function hasVisibleBalance(coin: PortfolioCoinView): boolean {
  return toNumber(coin.walletBalance) !== 0 || toNumber(coin.equity) !== 0;
}

function toWalletBalanceText(coin: {
  coin: string;
  walletBalance: string;
  equity: string;
  availableToWithdraw: string;
  unrealisedPnl: string;
}): string {
  return `${coin.coin} - wallet: ${coin.walletBalance} - equity: ${coin.equity} - available: ${coin.availableToWithdraw} - pnl: ${coin.unrealisedPnl}`;
}

function toFundingBalanceText(balance: { coin: string; walletBalance: string; transferBalance: string; bonus?: string }): string {
  return `${balance.coin} - wallet: ${balance.walletBalance} - transfer: ${balance.transferBalance} - bonus: ${balance.bonus || "0"}`;
}

export async function PortfolioSection() {
  if (!hasBybitCredentials()) {
    return (
      <section style={{ marginTop: 24 }}>
        <h2>Portfolio</h2>

        <div
          style={{
            marginTop: 12,
            border: "2px solid #171717",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#fef3c7",
          }}
        >
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Configure `BYBIT_API_KEY` and `BYBIT_API_SECRET` to load portfolio balances and holdings.
          </p>
        </div>
      </section>
    );
  }

  const [unifiedResult, allCoinsResult, spotTickersResult, portfolioValuesResult] = await Promise.all([
    getWalletBalance({ accountType: "UNIFIED" }),
    getAllCoinsBalance(),
    getSpotTickers(),
    getSupabaseAnonClient().rpc("get_portfolio_values"),
  ]);

// select
//   h.recorded_at,
//   sum(h.quantity * p.price_usd) as portfolio_value_usd
// from portfolio_holdings h
// join asset_prices p
//   on p.recorded_at = h.recorded_at
//  and p.symbol = h.symbol
// group by h.recorded_at
// order by h.recorded_at;

  const portfolioValuesErrorMessage = portfolioValuesResult.error?.message ?? null;

  if (portfolioValuesResult.error) {
    console.error("Failed to load historical portfolio values:", portfolioValuesResult.error);
  }

  const portfolioHistory = toPortfolioHistory((portfolioValuesResult.data ?? null) as PortfolioValuesRpcRow[] | null);
  const recordedAtFilters = Array.from(new Set(portfolioHistory.map((point) => point.recordedAt)));

  const portfolioHoldingsResult = recordedAtFilters.length
    ? await getSupabaseAnonClient()
        .from("portfolio_holdings")
        .select("recorded_at, symbol, quantity")
        .in("recorded_at", recordedAtFilters)
    : { data: [] as PortfolioHoldingRow[], error: null };

  if (portfolioHoldingsResult.error) {
    console.error("Failed to load historical portfolio holdings:", portfolioHoldingsResult.error);
  }

  const portfolioHistoryWithHoldings = withHoldings(
    portfolioHistory,
    ((portfolioHoldingsResult.data ?? []) as PortfolioHoldingRow[])
  );

  const allCoins: Record<string, PortfolioCoinView> = {};

  const quantityBySymbol = aggregateHoldingsQuantityBySymbol({
    unifiedRows: unifiedResult.rows,
    allCoinsRows: allCoinsResult.rows,
  });

  unifiedResult.rows.forEach((row) => {
    row.coins.forEach((coin) => {
      if (!allCoins[coin.coin]) {
        allCoins[coin.coin] = {
          coin: coin.coin,
          walletBalance: "0",
          equity: "0",
          availableToWithdraw: "0",
          unrealisedPnl: "0",
          usdValue: 0,
        };
      }

      allCoins[coin.coin].walletBalance = String(
        Number(allCoins[coin.coin].walletBalance) + Number(coin.walletBalance)
      );
      allCoins[coin.coin].equity = String(Number(allCoins[coin.coin].equity) + Number(coin.equity));
      allCoins[coin.coin].availableToWithdraw = String(
        Number(allCoins[coin.coin].availableToWithdraw) + Number(coin.availableToWithdraw)
      );
      allCoins[coin.coin].unrealisedPnl = String(
        Number(allCoins[coin.coin].unrealisedPnl) + Number(coin.unrealisedPnl)
      );
      allCoins[coin.coin].usdValue += Number(coin.usdValue || 0);
    });
  });

  allCoinsResult.rows.forEach((row) => {
    row.balances.forEach((balance) => {
      if (!allCoins[balance.coin]) {
        allCoins[balance.coin] = {
          coin: balance.coin,
          walletBalance: "0",
          equity: "0",
          availableToWithdraw: "0",
          unrealisedPnl: "0",
          usdValue: 0,
        };
      }

      allCoins[balance.coin].walletBalance = String(
        Number(allCoins[balance.coin].walletBalance) + Number(balance.walletBalance)
      );
      allCoins[balance.coin].equity = String(
        Number(allCoins[balance.coin].equity) + Number(balance.walletBalance)
      );
    });
  });

  const items: PortfolioItem[] = Object.values(allCoins)
    .filter(hasVisibleBalance)
    .sort((a, b) => a.coin.localeCompare(b.coin))
    .map((coin) => ({
      key: coin.coin,
      text: `${coin.coin} - wallet: ${coin.walletBalance} - equity: ${coin.equity} - available: ${coin.availableToWithdraw} - pnl: ${coin.unrealisedPnl}`,
    }));

  const accountCoinBalances = buildAccountCoinBalances({
    unifiedRows: unifiedResult.rows,
    allCoinsRows: allCoinsResult.rows,
  });

  const usdtRateByCoin = buildUsdtRateMap(spotTickersResult.items);
  const accountValues = buildAccountValues({
    accountCoinBalances,
    usdtRateByCoin,
  });

  const btcUsdtRate = usdtRateByCoin.get("BTC") ?? 0;

  let totalUsdtValue = 0;
  quantityBySymbol.forEach((amount, coin) => {
    const usdtRate = usdtRateByCoin.get(coin);

    if (!usdtRate) {
      return;
    }

    totalUsdtValue += amount * usdtRate;
  });

  const totalBtcValue = btcUsdtRate > 0 ? totalUsdtValue / btcUsdtRate : 0;

  const accountSections = [
    ...unifiedResult.rows.map((row) => ({
      accountType: row.accountType,
      title: formatAccountType(row.accountType),
      count: row.coins.filter((coin) => Number(coin.walletBalance) !== 0).length,
      items: row.coins
        .filter((coin) => Number(coin.walletBalance) !== 0)
        .map((coin) => ({
          key: `${row.accountType}-${coin.coin}`,
          text: toWalletBalanceText(coin),
        })),
      value: accountValues.get(row.accountType) ?? { usdt: 0, btc: 0 },
    })),
    ...allCoinsResult.rows.map((row) => ({
      accountType: row.accountType,
      title: formatAccountType(row.accountType),
      count: row.balances.filter((balance) => Number(balance.walletBalance) !== 0).length,
      items: row.balances
        .filter((balance) => Number(balance.walletBalance) !== 0)
        .map((balance) => ({
          key: `${row.accountType}-${balance.coin}`,
          text: toFundingBalanceText(balance),
        })),
      value: accountValues.get(row.accountType) ?? { usdt: 0, btc: 0 },
    })),
  ].filter((section) => section.items.length > 0);

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Portfolio</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#ecfeff",
        }}
      >
        <p style={{ marginTop: 0, marginBottom: 6 }}>Total coins: {items.length}</p>
        <p style={{ marginTop: 0, marginBottom: 12 }}>
          Total value: {toFixedValue(totalUsdtValue, 2)} USDT ({toFixedValue(totalBtcValue, 8)} BTC)
        </p>

        {portfolioValuesErrorMessage ? (
          <p style={{ marginTop: 0, marginBottom: 12, color: "#b91c1c" }}>
            Failed to load historical portfolio values: {portfolioValuesErrorMessage}
          </p>
        ) : null}

        {portfolioHistoryWithHoldings.length > 0 ? (
          <PortfolioHistoryChart data={portfolioHistoryWithHoldings} />
        ) : (
          <p style={{ marginTop: 0, marginBottom: 12 }}>No historical portfolio values available yet.</p>
        )}

        {items.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {items.map((item) => (
              <li key={item.key}>{item.text}</li>
            ))}
          </ul>
        ) : null}

        {accountSections.length > 0 ? (
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            {accountSections.map((section) => (
              <div
                key={section.accountType}
                style={{
                  border: "1px solid rgba(23, 23, 23, 0.2)",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.55)",
                }}
              >
                <p style={{ marginTop: 0, marginBottom: 8 }}>
                  {section.title} ({section.count})
                </p>
                <p style={{ marginTop: 0, marginBottom: 8 }}>
                  Value: {toFixedValue(section.value.usdt, 2)} USDT ({toFixedValue(section.value.btc, 8)} BTC)
                </p>

                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {section.items.map((item) => (
                    <li key={item.key}>{item.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}