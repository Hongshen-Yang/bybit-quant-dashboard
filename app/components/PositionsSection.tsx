type PositionItem = {
  key: string;
  text: string;
};

type PositionsSectionProps = {
  items: PositionItem[];
};

export function PositionsSection({ items }: PositionsSectionProps) {
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