import { getExecutionList } from "@/lib/bybit/execution/get-execution-list";
import { getDepositRecords } from "@/lib/bybit/asset/get-deposit-records";
import { getInternalTransferRecords } from "@/lib/bybit/asset/get-internal-transfer-records";
import { getWithdrawalRecords } from "@/lib/bybit/asset/get-withdrawal-records";
import { formatUtcDateTime } from "@/lib/utils/utc";
import { hasBybitCredentials } from "@/lib/bybit/client";

type ActivitiesItem = {
  key: string;
  text: string;
  timeMs: number;
};

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

  return formatUtcDateTime(timeMs);
}

export async function ActivitiesSection() {
  if (!hasBybitCredentials()) {
    return (
      <section style={{ marginTop: 24 }}>
        <h2>Recent Activities</h2>

        <div
          style={{
            marginTop: 12,
            border: "2px solid #171717",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#f8fafc",
          }}
        >
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Configure `BYBIT_API_KEY` and `BYBIT_API_SECRET` to load private activity history.
          </p>
        </div>
      </section>
    );
  }

  const perSourceLimit = 10;

  const [executionResults, depositResult, withdrawalResult, internalTransferResult] = await Promise.allSettled([
    (async () => {
      const executionCategories = ["linear", "inverse", "option", "spot"] as const;
      const results = await Promise.allSettled(
        executionCategories.map((category) => getExecutionList({ category, limit: perSourceLimit }))
      );
      return results;
    })(),
    getDepositRecords({ limit: perSourceLimit }),
    getWithdrawalRecords({ limit: perSourceLimit }),
    getInternalTransferRecords({ limit: perSourceLimit }),
  ]);

  const items: ActivitiesItem[] = [];

  // Add executions
  if (executionResults.status === "fulfilled") {
    const executionCategories = ["linear", "inverse", "option", "spot"] as const;
    executionResults.value.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        return;
      }

      const category = result.value.category ?? executionCategories[index];
      result.value.items.forEach((execution, itemIndex) => {
        const timeMs = parseTimeValue(execution.execTime);
        items.push({
          key: `execution-${category}-${execution.execId}-${itemIndex}`,
          timeMs,
          text: `EXECUTION | ${category.toUpperCase()} | ${execution.symbol} | ${execution.side} ${execution.execQty} @ ${execution.execPrice} | fee: ${execution.execFee} ${execution.feeCurrency} | ${toTimelineLabel(timeMs)}`,
        });
      });
    });
  }

  // Add deposits
  if (depositResult.status === "fulfilled") {
    depositResult.value.items.forEach((deposit, index) => {
      const timeMs = parseTimeValue(deposit.successAt);
      items.push({
        key: `deposit-${deposit.id || index}`,
        timeMs,
        text: `DEPOSIT | ${deposit.coin} ${deposit.amount} | Status ${deposit.status} | ${toTimelineLabel(timeMs)}`,
      });
    });
  }

  // Add withdrawals
  if (withdrawalResult.status === "fulfilled") {
    withdrawalResult.value.items.forEach((withdrawal, index) => {
      const timeMs = parseTimeValue(withdrawal.createTime || withdrawal.updateTime);
      items.push({
        key: `withdrawal-${withdrawal.withdrawId || index}`,
        timeMs,
        text: `WITHDRAWAL | ${withdrawal.coin} ${withdrawal.amount} | Status ${withdrawal.status} | ${toTimelineLabel(timeMs)}`,
      });
    });
  }

  // Add internal transfers
  if (internalTransferResult.status === "fulfilled") {
    internalTransferResult.value.items.forEach((transfer, index) => {
      const timeMs = parseTimeValue(transfer.timestamp);
      items.push({
        key: `internal-transfer-${transfer.transferId || index}`,
        timeMs,
        text: `TRANSFER | ${transfer.coin} ${transfer.amount} | ${transfer.fromAccountType} -> ${transfer.toAccountType} | Status ${transfer.status} | ${toTimelineLabel(timeMs)}`,
      });
    });
  }

  // Sort by time (newest first) and limit to 10
  const topItems = items
    .sort((a, b) => b.timeMs - a.timeMs)
    .slice(0, 10)
    .map((item) => ({ key: item.key, text: item.text }));

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Recent Activities</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#f8fafc",
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {topItems.length === 0 ? (
            <li>No recent activities found.</li>
          ) : (
            topItems.map((item) => <li key={item.key}>{item.text}</li>)
          )}
        </ul>
      </div>
    </section>
  );
}