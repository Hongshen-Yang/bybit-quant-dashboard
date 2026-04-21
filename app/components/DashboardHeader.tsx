import { getFeeRate } from "@/lib/bybit/account/get-fee-rate";
import { getSystemStatus } from "@/lib/bybit/system/get-system-status";

type DashboardHeaderProps = {
  utcNow: string;
};

export async function DashboardHeader({ utcNow }: DashboardHeaderProps) {
  const feeRateCategories = ["linear", "inverse", "option", "spot"] as const;
  const [feeRateResults, systemStatusResult] = await Promise.all([
    Promise.allSettled(feeRateCategories.map((category) => getFeeRate({ category }))),
    getSystemStatus(),
  ]);

  const activeSystemStatus = systemStatusResult.items.filter((item) => item.state !== "normal");
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
      return [`${category.toUpperCase()} maker: ${fee.makerFeeRate}, taker: ${fee.takerFeeRate} (${market})`];
    })
    .join(" |");

  return (
    <>
      <p style={{ marginTop: 4, marginBottom: 0 }}>{systemStatusSummary}</p>
      <p style={{ marginTop: 4, marginBottom: 0 }}>
        Current fee rate: {feeRateSummary || "No fee rate found."}
      </p>
    </>
  );
}