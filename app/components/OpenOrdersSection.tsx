type OpenOrderListItem = {
  key: string;
  text: string;
};

type OpenOrdersSectionProps = {
  items: OpenOrderListItem[];
};

export function OpenOrdersSection({ items }: OpenOrdersSectionProps) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2>Open Orders</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#fef9c3",
        }}
      >
        <p style={{ marginTop: 0 }}>Total open orders: {items.length}</p>

        {items.length === 0 ? (
          <p style={{ marginBottom: 0 }}>No open orders found.</p>
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