      {/* 1. Only UNIFIED account available from sub API `get-wallet-balance.ts`
      2. If no coin param passed, `get-all-coins-balance.ts` results returns no UNIFIED account results
      3. Combine `get-wallet-balance.ts` with `get-all-coins-balance.ts` for the complete picture */}

type HoldingsItem = {
  key: string;
  text: string;
};

type HoldingsSectionProps = {
  items: HoldingsItem[];
};

export function HoldingsSection({ items }: HoldingsSectionProps) {
  return (
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
        <p style={{ marginTop: 0 }}>Total coins: {items.length}</p>

        {items.length === 0 ? (
          <p style={{ marginBottom: 0 }}>No balances found.</p>
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