import { getDepositRecords } from "@/lib/bybit/asset/get-deposit-records";
import { getInternalTransferRecords } from "@/lib/bybit/asset/get-internal-transfer-records";
import { getWithdrawalRecords } from "@/lib/bybit/asset/get-withdrawal-records";

type TimelineItem = {
  key: string;
  text: string;
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

  return new Date(timeMs).toLocaleString();
}

export async function DepositsWithdrawalsSection() {
  const [depositResult, withdrawalResult, internalTransferResult] = await Promise.all([
    getDepositRecords(),
    getWithdrawalRecords(),
    getInternalTransferRecords(),
  ]);

  const items: TimelineItem[] = [
    ...depositResult.items.map((deposit, index) => {
      const timeMs = parseTimeValue(deposit.successAt);
      return {
        key: `deposit-${deposit.id || index}`,
        timeMs,
        text: `${toTimelineLabel(timeMs)} | Deposit | ${deposit.coin} ${deposit.amount} | Status ${deposit.status}`,
      };
    }),
    ...withdrawalResult.items.map((withdrawal, index) => {
      const timeMs = parseTimeValue(withdrawal.createTime || withdrawal.updateTime);
      return {
        key: `withdrawal-${withdrawal.withdrawId || index}`,
        timeMs,
        text: `${toTimelineLabel(timeMs)} | Withdrawal | ${withdrawal.coin} ${withdrawal.amount} | Status ${withdrawal.status}`,
      };
    }),
    ...internalTransferResult.items.map((transfer, index) => {
      const timeMs = parseTimeValue(transfer.timestamp);
      return {
        key: `internal-transfer-${transfer.transferId || index}`,
        timeMs,
        text: `${toTimelineLabel(timeMs)} | Internal Transfer | ${transfer.coin} ${transfer.amount} | ${transfer.fromAccountType} -> ${transfer.toAccountType} | Status ${transfer.status}`,
      };
    }),
  ]
    .sort((a, b) => b.timeMs - a.timeMs)
    .map((item) => ({ key: item.key, text: item.text }));

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Deposits & Withdrawals Timeline</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#fff7ed",
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {items.length === 0 ? (
            <li>No deposits or withdrawals found.</li>
          ) : (
            items.map((item) => <li key={item.key}>{item.text}</li>)
          )}
        </ul>
      </div>
    </section>
  );
}