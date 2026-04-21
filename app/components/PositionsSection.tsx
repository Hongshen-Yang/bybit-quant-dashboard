import { getPositionInfo } from "@/lib/bybit/position/get-position-info";

type PositionItem = {
  key: string;
  text: string;
};

export async function PositionsSection() {
  const positionCategories = ["linear", "inverse", "option"] as const;
  const positionResults = await Promise.allSettled(
    positionCategories.map((category) => getPositionInfo({ category }))
  );

  const items: PositionItem[] = positionResults.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const category = result.value.category ?? positionCategories[index];
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
          <p style={{ marginBottom: 0 }}>No positions found.</p>
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