import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getSpotTickers } from "@/lib/bybit/market/get-tickers";
import { type BybitAccountType } from "@/lib/bybit/types";

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

function buildUsdtRateMap(tickerItems: Array<{ symbol: string; lastPrice: string }>) {
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

export async function PortfolioSection() {
  const [unifiedResult, allCoinsResult, spotTickersResult] = await Promise.all([
    getWalletBalance({ accountType: "UNIFIED" }),
    getAllCoinsBalance(),
    getSpotTickers(),
  ]);

  const allCoins: Record<string, PortfolioCoinView> = {};

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

  const accountCoinBalances = new Map<BybitAccountType, Map<string, number>>();

  unifiedResult.rows.forEach((row) => {
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

  allCoinsResult.rows.forEach((row) => {
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

  const usdtRateByCoin = buildUsdtRateMap(spotTickersResult.items);
  const btcUsdtRate = usdtRateByCoin.get("BTC") ?? 0;

  const accountValues = new Map<BybitAccountType, { usdt: number; btc: number }>();
  accountCoinBalances.forEach((coinBalances, accountType) => {
    let totalUsdt = 0;

    coinBalances.forEach((amount, coin) => {
      const usdtRate = usdtRateByCoin.get(coin);
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

  let totalUsdtValue = 0;
  Object.values(allCoins).forEach((coin) => {
    const amount = Number(coin.walletBalance);
    const usdtRate = usdtRateByCoin.get(coin.coin);

    if (Number.isNaN(amount) || !usdtRate) {
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