import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getSpotTickers } from "@/lib/bybit/market/get-tickers";
import { getSupabaseAnonClient } from "@/lib/supabase/client";

type StorePortfolioSnapshotParams = {
  recordedAt?: Date | string;
  includeZeroBalances?: boolean;
};

type SnapshotInsertSummary = {
  recordedAt: string;
  holdingsInserted: number;
  pricesInserted: number;
  holdingsSymbols: string[];
  pricedSymbols: string[];
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

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function toRecordedAtIso(value?: Date | string): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid recordedAt value: ${value}`);
  }

  return parsed.toISOString();
}

function buildUsdtPriceBySymbol(
  tickerItems: Array<{ symbol: string; lastPrice: string }>
): Map<string, number> {
  const prices = new Map<string, number>();

  prices.set("USDT", 1);
  prices.set("USDC", 1);

  tickerItems.forEach((ticker) => {
    if (!ticker.symbol.endsWith("USDT")) return;

    const coin = ticker.symbol.slice(0, -4);
    const price = Number(ticker.lastPrice);
    if (!coin || Number.isNaN(price) || price <= 0) return;

    prices.set(coin, price);
  });

  return prices;
}

function aggregateHoldingsQuantityBySymbol(params: {
  unifiedRows: Awaited<ReturnType<typeof getWalletBalance>>["rows"];
  allCoinsRows: Awaited<ReturnType<typeof getAllCoinsBalance>>["rows"];
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

export async function storePortfolioSnapshot(
  params: StorePortfolioSnapshotParams = {}
): Promise<SnapshotInsertSummary> {
  const includeZeroBalances = params.includeZeroBalances ?? false;
  const recordedAt = toRecordedAtIso(params.recordedAt);

  const [walletBalanceResult, allCoinsBalanceResult, spotTickersResult] = await Promise.all([
    getWalletBalance({ accountType: "UNIFIED" }).catch((error: unknown) => {
      throw new Error(`Bybit getWalletBalance failed: ${formatUnknownError(error)}`);
    }),
    getAllCoinsBalance().catch((error: unknown) => {
      throw new Error(`Bybit getAllCoinsBalance failed: ${formatUnknownError(error)}`);
    }),
    getSpotTickers().catch((error: unknown) => {
      throw new Error(`Bybit getSpotTickers failed: ${formatUnknownError(error)}`);
    }),
  ]);

  const quantityBySymbol = aggregateHoldingsQuantityBySymbol({
    unifiedRows: walletBalanceResult.rows,
    allCoinsRows: allCoinsBalanceResult.rows,
  });
  const usdtPriceBySymbol = buildUsdtPriceBySymbol(spotTickersResult.items);

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
    holdingsInserted: holdingsRows.length,
    pricesInserted: assetPriceRows.length,
    holdingsSymbols: holdingsRows.map((r) => r.symbol),
    pricedSymbols: assetPriceRows.map((r) => r.symbol),
  };
}