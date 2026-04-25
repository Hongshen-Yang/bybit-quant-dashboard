import { storePortfolioSnapshot } from "@/lib/supabase/store-portfolio-snapshot";

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function main() {
  const summary = await storePortfolioSnapshot();

  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

main().catch((error) => {
  const message = formatUnknownError(error);
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
});