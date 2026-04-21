import { DashboardHeader } from "./components/DashboardHeader";
import { PortfolioSection } from "./components/PortfolioSection";
import { ActivitiesSection } from "./components/ActivitiesSection";
import { DepositsWithdrawalsSection } from "./components/DepositsWithdrawalsSection";
import { PositionsSection } from "./components/PositionsSection";
import { OpenOrdersSection } from "./components/OpenOrdersSection";

export default async function Home() {
  const utcNow = new Date().toUTCString();

  return (
    <main style={{ padding: "24px" }}>
      <h1>Bybit Quant Dashboard</h1>
      <p style={{ marginTop: 4, marginBottom: 0 }}>UTC: {utcNow}</p>
      <DashboardHeader utcNow={utcNow} />
      <PortfolioSection />
      <PositionsSection />
      <OpenOrdersSection />
      <ActivitiesSection />
      <DepositsWithdrawalsSection />
    </main>
  );
}