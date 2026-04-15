import { getWalletBalance } from "@/lib/bybit/account/get-wallet-balance";
import { getAllCoinsBalance } from "@/lib/bybit/asset/get-all-coins-balance";
import { getTransactionLogUTA } from "@/lib/bybit/account/get-transaction-log-UTA";
import { getDepositRecords } from "@/lib/bybit/asset/get-deposit-records";
import { getWithdrawalRecords } from "@/lib/bybit/asset/get-withdrawal-records";

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
  
  const { items: transactionLogs, nextPageCursor } = await getTransactionLogUTA();
  const { items: deposits } = await getDepositRecords();
  const { items: withdrawals } = await getWithdrawalRecords();

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

  return (
    <main style={{ padding: "24px" }}>
      <h1>Bybit Quant Dashboard</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Holdings</h2>

        <div
          style={{
            marginTop: 12,
            border: "2px solid #171717",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#ecfeff",
          }}
        >
          <p style={{ marginTop: 0 }}>
            Total coins: {mergedItems.length}
          </p>

          {mergedItems.length === 0 ? (
            <p style={{ marginBottom: 0 }}>No balances found.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {mergedItems.map((item) => (
                <li key={item.key}>{item.text}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Activities</h2>

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
            {transactionLogs.length === 0 ? (
              <li>No transaction logs found.</li>
            ) : (
              transactionLogs.map((log, index) => (
                <li key={(log as { id?: string }).id ?? `${index}`}>
                  {JSON.stringify(log)}
                </li>
              ))
            )}
          </ul>

          {nextPageCursor ? (
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              Next cursor: {nextPageCursor}
            </p>
          ) : null}
        </div>
      </section>

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
            {timelineItems.length === 0 ? (
              <li>No deposits or withdrawals found.</li>
            ) : (
              timelineItems.map((item) => <li key={item.key}>{item.text}</li>)
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}