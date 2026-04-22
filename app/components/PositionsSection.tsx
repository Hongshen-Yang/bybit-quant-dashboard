import { getPositionInfo } from "@/lib/bybit/position/get-position-info";

type PositionItem = {
  key: string;
  text: string;
};

export async function PositionsSection() {
  // Try to fetch positions from different categories
  // Some positions might require settleCoin to be specified
  const allCategories = ["linear", "inverse", "option"] as const;
  const settlementCoins = ["USDT", "USDC", ""] as const; // Empty string means no filter

  // Build all combinations to try
  const queries = allCategories.flatMap((category) =>
    settlementCoins.map((settleCoin) => ({
      category,
      settleCoin: settleCoin ? settleCoin : undefined,
    }))
  );

  const positionResults = await Promise.allSettled(
    queries.map((params) =>
      getPositionInfo(params as Parameters<typeof getPositionInfo>[0])
    )
  );

  const items: PositionItem[] = positionResults.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      const query = queries[index];
      const error = result.reason;
      console.warn(
        `Failed to fetch positions (${query.category}, settleCoin: ${query.settleCoin}):`,
        error?.message || error
      );
      return [];
    }

    const query = queries[index];
    const category = result.value.category ?? query.category;
    const itemsCount = result.value.items.length;
    
    if (itemsCount > 0) {
      console.log(
        `✓ Found ${itemsCount} positions for ${query.category} (settleCoin: ${query.settleCoin}):`,
        result.value
      );
    }

    return result.value.items.map((position, itemIndex) => ({
      key: `${category}-${position.symbol}-${position.side}-${position.positionIdx}-${itemIndex}`,
      text: `${category.toUpperCase()} | ${position.symbol} | ${position.side} | size: ${position.size} | avg: ${position.avgPrice} | mark: ${position.markPrice} | uPnL: ${position.unrealisedPnl}`,
    }));
  });

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Positions</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#eef2ff",
        }}
      >
        <p style={{ marginTop: 0 }}>Total positions: {items.length}</p>

        {items.length === 0 ? (
          <div>
            <p style={{ marginBottom: 8 }}>No positions found.</p>
            <details style={{ fontSize: "12px", color: "#666" }}>
              <summary>Debug Info (click to expand)</summary>
              <pre style={{ background: "#f5f5f5", padding: "8px", overflow: "auto" }}>
                {JSON.stringify(
                  positionResults.map((r) =>
                    r.status === "fulfilled"
                      ? { status: "fulfilled", itemCount: r.value.items.length }
                      : { status: "rejected", error: String(r.reason) }
                  ),
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {items.map((item) => (
              <li key={item.key}>{item.text}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}