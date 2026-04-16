import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getFeeRate } from "@/lib/bybit/account/get-fee-rate";
import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getDepositRecords } from "@/lib/bybit/asset/get-deposit-records";
import { getWithdrawalRecords } from "@/lib/bybit/asset/get-withdrawal-records";
import { getPositionInfo } from "@/lib/bybit/position/get-position-info";
import { getOpenOrders } from "@/lib/bybit/trade/get-open-orders";
import { getExecutionList } from "@/lib/bybit/execution/get-execution-list";
import { getSystemStatus } from "@/lib/bybit/system/get-system-status";
import { HoldingsSection } from "./components/HoldingsSection";
import { ActivitiesSection } from "./components/ActivitiesSection";
import { DepositsWithdrawalsSection } from "./components/DepositsWithdrawalsSection";
import { PositionsSection } from "./components/PositionsSection";
import { OpenOrdersSection } from "./components/OpenOrdersSection";

function parseTimeValue(value?: string): number {
  if (!value) return 0;

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toTimelineLabel(timeMs: number): string {
  if (!timeMs) return "Unknown time";
  return new Date(timeMs).toLocaleString();
}

export default async function Home() {
  // Get UNIFIED from wallet balance (more reliable)
  const unifiedResult = await getWalletBalance({ accountType: "UNIFIED" });
  
  // Get other account types from getAllCoinsBalance
  const allCoinsResult = await getAllCoinsBalance();
  
  console.log("UNIFIED rows:", unifiedResult.rows.length, "total coins:", unifiedResult.totalRows);
  console.log("getAllCoinsBalance rows:", allCoinsResult.rows.length, "total coins:", allCoinsResult.totalRows);
  console.log("UNIFIED result:", unifiedResult);
  console.log("getAllCoinsBalance result:", allCoinsResult);
  
  // Merge all coins from both sources, grouped by coin
  const allCoins: Record<string, { coin: string; walletBalance: string; equity: string; availableToWithdraw: string; unrealisedPnl: string; usdValue: number }> = {};
  
  // Process UNIFIED from wallet balance
  unifiedResult.rows.forEach((row) => {
    row.coins.forEach((coin) => {
      if (!allCoins[coin.coin]) {
        allCoins[coin.coin] = { coin: coin.coin, walletBalance: "0", equity: "0", availableToWithdraw: "0", unrealisedPnl: "0", usdValue: 0 };
      }
      allCoins[coin.coin].walletBalance = String(Number(allCoins[coin.coin].walletBalance) + Number(coin.walletBalance));
      allCoins[coin.coin].equity = String(Number(allCoins[coin.coin].equity) + Number(coin.equity));
      allCoins[coin.coin].availableToWithdraw = String(Number(allCoins[coin.coin].availableToWithdraw) + Number(coin.availableToWithdraw));
      allCoins[coin.coin].unrealisedPnl = String(Number(allCoins[coin.coin].unrealisedPnl) + Number(coin.unrealisedPnl));
      allCoins[coin.coin].usdValue = allCoins[coin.coin].usdValue + Number(coin.usdValue || 0);
    });
  });
  
  // Process other account types from getAllCoinsBalance
  allCoinsResult.rows.forEach((row) => {
    row.balances.forEach((balance) => {
      if (!allCoins[balance.coin]) {
        allCoins[balance.coin] = { coin: balance.coin, walletBalance: "0", equity: "0", availableToWithdraw: "0", unrealisedPnl: "0", usdValue: 0 };
      }
      allCoins[balance.coin].walletBalance = String(Number(allCoins[balance.coin].walletBalance) + Number(balance.walletBalance));
      allCoins[balance.coin].equity = String(Number(allCoins[balance.coin].equity) + Number(balance.walletBalance)); // use walletBalance as proxy for equity
    });
  });
  
  const mergedItems = Object.values(allCoins)
    .sort((a, b) => a.coin.localeCompare(b.coin))
    .map((coin) => ({
      key: coin.coin,
      text: `${coin.coin} - wallet: ${coin.walletBalance} - equity: ${coin.equity} - available: ${coin.availableToWithdraw} - pnl: ${coin.unrealisedPnl}`,
    }));
  
  const { items: deposits } = await getDepositRecords();
  const { items: withdrawals } = await getWithdrawalRecords();

  const positionCategories = ["linear", "inverse", "option"] as const;
  const positionResults = await Promise.allSettled(
    positionCategories.map((category) => getPositionInfo({ category }))
  );

  const orderCategories = ["linear", "inverse", "option", "spot"] as const;
  const openOrderResults = await Promise.allSettled(
    orderCategories.map((category) => getOpenOrders({ category }))
  );

  const executionCategories = ["linear", "inverse", "option", "spot"] as const;
  const executionResults = await Promise.allSettled(
    executionCategories.map((category) => getExecutionList({ category, limit: 50 }))
  );

  const feeRateCategories = ["linear", "inverse", "option", "spot"] as const;
  const feeRateResults = await Promise.allSettled(
    feeRateCategories.map((category) => getFeeRate({ category }))
  );
  const { items: systemStatusItems } = await getSystemStatus();

  const positions = positionResults.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const category = result.value.category ?? positionCategories[index];
    return result.value.items.map((position, itemIndex) => ({
      key: `${category}-${position.symbol}-${position.side}-${position.positionIdx}-${itemIndex}`,
      text: `${category.toUpperCase()} | ${position.symbol} | ${position.side} | size: ${position.size} | avg: ${position.avgPrice} | mark: ${position.markPrice} | uPnL: ${position.unrealisedPnl}`,
    }));
  });

  const openOrders = openOrderResults.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const category = result.value.category ?? orderCategories[index];
    return result.value.items.map((order, itemIndex) => ({
      key: `${category}-${order.orderId}-${itemIndex}`,
      text: `${category.toUpperCase()} | ${order.symbol} | ${order.side} | ${order.orderType} | qty: ${order.qty} | price: ${order.price} | status: ${order.orderStatus}`,
    }));
  });

  const activityItems = executionResults
    .flatMap((result, index) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      const category = result.value.category ?? executionCategories[index];
      return result.value.items.map((execution, itemIndex) => ({
        key: `${category}-${execution.execId}-${itemIndex}`,
        timeMs: parseTimeValue(execution.execTime),
        text: `${category.toUpperCase()} | ${execution.symbol} | ${execution.side} ${execution.execQty} @ ${execution.execPrice} | fee: ${execution.execFee} ${execution.feeCurrency} | ${toTimelineLabel(parseTimeValue(execution.execTime))}`,
      }));
    })
    .sort((a, b) => b.timeMs - a.timeMs)
    .map((item) => ({ key: item.key, text: item.text }));

  const timelineItems = [
    ...deposits.map((deposit, index) => {
      const timeMs = parseTimeValue(deposit.successAt);
      return {
        key: `deposit-${deposit.id || index}`,
        timeMs,
        text: `${toTimelineLabel(timeMs)} | Deposit | ${deposit.coin} ${deposit.amount} | Status ${deposit.status}`,
      };
    }),
    ...withdrawals.map((withdrawal, index) => {
      const timeMs = parseTimeValue(withdrawal.createTime || withdrawal.updateTime);
      return {
        key: `withdrawal-${withdrawal.withdrawId || index}`,
        timeMs,
        text: `${toTimelineLabel(timeMs)} | Withdrawal | ${withdrawal.coin} ${withdrawal.amount} | Status ${withdrawal.status}`,
      };
    }),
  ].sort((a, b) => b.timeMs - a.timeMs);

  const utcNow = new Date().toUTCString();
  const activeSystemStatus = systemStatusItems.filter((item) => item.state !== "normal");
  const systemStatusSummary =
    activeSystemStatus.length === 0
      ? "System status: Normal"
      : `System status: ${activeSystemStatus.length} active notice(s) - ${activeSystemStatus[0].title} (${activeSystemStatus[0].state})`;
  const feeRateSummary = feeRateResults
    .flatMap((result, index) => {
      if (result.status !== "fulfilled" || result.value.items.length === 0) {
        return [];
      }

      const category = result.value.category ?? feeRateCategories[index];
      const fee = result.value.items[0];
      const market = fee.symbol || fee.baseCoin || "all";
      return [
        `${category.toUpperCase()} maker: ${fee.makerFeeRate}, taker: ${fee.takerFeeRate} (${market})`,
      ];
    })
    .join(" | ");

  return (
    <main style={{ padding: "24px" }}>
      <h1>Bybit Quant Dashboard</h1>
      <p style={{ marginTop: 4, marginBottom: 0 }}>{systemStatusSummary}</p>
      <p style={{ marginTop: 4, marginBottom: 0 }}>UTC: {utcNow}</p>
      <p style={{ marginTop: 4, marginBottom: 0 }}>
        Current fee rate: {feeRateSummary || "No fee rate found."}
      </p>
      <HoldingsSection items={mergedItems} />
      <PositionsSection items={positions} />
      <OpenOrdersSection items={openOrders} />
      <ActivitiesSection items={activityItems} />
      <DepositsWithdrawalsSection items={timelineItems} />
    </main>
  );
}