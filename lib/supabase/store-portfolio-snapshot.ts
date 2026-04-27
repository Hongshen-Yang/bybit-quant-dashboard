import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getSpotTickers } from "@/lib/bybit/market/get-tickers";
import { aggregateHoldingsQuantityBySymbol, buildUsdtRateMap } from "@/lib/utils/portfolio-calculations";
import { getSupabaseAnonClient } from "@/lib/supabase/client";
import { toUtcIso } from "@/lib/utils/utc";

type StorePortfolioSnapshotParams = {
  recordedAt?: Date | string;
  includeZeroBalances?: boolean;
};

type SnapshotInsertSummary = {
  recordedAt: string;
  portfolioHoldingsOk: boolean;
  assetPricesOk: boolean;
};

type PortfolioHoldingInsertRow = {
  recorded_at: string;
  symbol: string;
  quantity: number;
};

type AssetPriceInsertRow = {
  recorded_at: string;
  symbol: string;
  price_usd: number;
};

const MAX_BALANCE_ATTEMPTS = 3;
const BALANCE_RETRY_DELAYS_MS = [3000, 7000];

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasNonZeroUnifiedBalance(rows: Awaited<ReturnType<typeof getWalletBalance>>["rows"]): boolean {
  return rows.some((row) =>
    row.coins.some((coin) => {
      const quantity = Number(coin.walletBalance);
      return !Number.isNaN(quantity) && quantity !== 0;
    })
  );
}

function hasNonZeroFundingBalance(rows: Awaited<ReturnType<typeof getAllCoinsBalance>>["rows"]): boolean {
  const fundingRow = rows.find((row) => row.accountType === "FUND");
  if (!fundingRow) return false;

  return fundingRow.balances.some((balance) => {
    const quantity = Number(balance.walletBalance);
    return !Number.isNaN(quantity) && quantity !== 0;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchBalancesWithRetry() {
  let lastWalletBalanceResult: Awaited<ReturnType<typeof getWalletBalance>> | null = null;
  let lastAllCoinsBalanceResult: Awaited<ReturnType<typeof getAllCoinsBalance>> | null = null;

  for (let attempt = 1; attempt <= MAX_BALANCE_ATTEMPTS; attempt += 1) {
    const [walletBalanceResult, allCoinsBalanceResult] = await Promise.all([
      getWalletBalance({ accountType: "UNIFIED" }).catch((error: unknown) => {
        throw new Error(`Bybit getWalletBalance failed: ${formatUnknownError(error)}`);
      }),
      getAllCoinsBalance().catch((error: unknown) => {
        throw new Error(`Bybit getAllCoinsBalance failed: ${formatUnknownError(error)}`);
      }),
    ]);

    lastWalletBalanceResult = walletBalanceResult;
    lastAllCoinsBalanceResult = allCoinsBalanceResult;

    const unifiedOk = hasNonZeroUnifiedBalance(walletBalanceResult.rows);
    const fundingOk = hasNonZeroFundingBalance(allCoinsBalanceResult.rows);

    if (unifiedOk && fundingOk) {
      if (attempt > 1) {
        console.log(`Balance retry recovered on attempt ${attempt}.`);
      }
      return { walletBalanceResult, allCoinsBalanceResult };
    }

    if (attempt < MAX_BALANCE_ATTEMPTS) {
      const delayMs = BALANCE_RETRY_DELAYS_MS[attempt - 1] ?? 5000;
      console.warn(
        `Balance snapshot incomplete on attempt ${attempt}/${MAX_BALANCE_ATTEMPTS} (unifiedOk=${unifiedOk}, fundingOk=${fundingOk}). Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
      continue;
    }

    console.warn(
      `Balance snapshot still incomplete after ${MAX_BALANCE_ATTEMPTS} attempts (unifiedOk=${unifiedOk}, fundingOk=${fundingOk}). Recording last returned data.`
    );
  }

  if (!lastWalletBalanceResult || !lastAllCoinsBalanceResult) {
    throw new Error("Failed to fetch balances for snapshot");
  }

  return {
    walletBalanceResult: lastWalletBalanceResult,
    allCoinsBalanceResult: lastAllCoinsBalanceResult,
  };
}

export async function storePortfolioSnapshot(
  params: StorePortfolioSnapshotParams = {}
): Promise<SnapshotInsertSummary> {
  const includeZeroBalances = params.includeZeroBalances ?? false;
  const recordedAt = toUtcIso(params.recordedAt);

  const [{ walletBalanceResult, allCoinsBalanceResult }, spotTickersResult] = await Promise.all([
    fetchBalancesWithRetry(),
    getSpotTickers().catch((error: unknown) => {
      throw new Error(`Bybit getSpotTickers failed: ${formatUnknownError(error)}`);
    }),
  ]);

  const quantityBySymbol = aggregateHoldingsQuantityBySymbol({
    unifiedRows: walletBalanceResult.rows,
    allCoinsRows: allCoinsBalanceResult.rows,
  });
  const usdtPriceBySymbol = buildUsdtRateMap(spotTickersResult.items);

  const supabase = getSupabaseAnonClient();

  const holdingsRows: PortfolioHoldingInsertRow[] = [];
  const assetPriceRows: AssetPriceInsertRow[] = [];

  quantityBySymbol.forEach((quantity, symbol) => {
    if (!includeZeroBalances && quantity === 0) return;

    holdingsRows.push({ recorded_at: recordedAt, symbol, quantity });

    const price = usdtPriceBySymbol.get(symbol);
    if (price && price > 0) {
      assetPriceRows.push({ recorded_at: recordedAt, symbol, price_usd: price });
    }
  });

  if (holdingsRows.length > 0) {
    const { error } = await supabase.from("portfolio_holdings").insert(holdingsRows);
    if (error) throw new Error(`Failed to insert portfolio_holdings: ${JSON.stringify(error)}`);
  }

  if (assetPriceRows.length > 0) {
    const { error } = await supabase.from("asset_prices").insert(assetPriceRows);
    if (error) throw new Error(`Failed to insert asset_prices: ${JSON.stringify(error)}`);
  }

  return {
    recordedAt,
    portfolioHoldingsOk: true,
    assetPricesOk: true,
  };
}