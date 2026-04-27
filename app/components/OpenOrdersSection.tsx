import { getOpenOrders } from "@/lib/bybit/trade/get-open-orders";
import { hasBybitCredentials } from "@/lib/bybit/client";

type OpenOrderListItem = {
  key: string;
  text: string;
};

export async function OpenOrdersSection() {
  if (!hasBybitCredentials()) {
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
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Configure `BYBIT_API_KEY` and `BYBIT_API_SECRET` to load private open orders.
          </p>
        </div>
      </section>
    );
  }

  const orderCategories = ["linear", "inverse", "option", "spot"] as const;
  const openOrderResults = await Promise.allSettled(
    orderCategories.map((category) => getOpenOrders({ category }))
  );

  const items: OpenOrderListItem[] = openOrderResults.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const category = result.value.category ?? orderCategories[index];
    return result.value.items.map((order, itemIndex) => ({
      key: `${category}-${order.orderId}-${itemIndex}`,
      text: `${category.toUpperCase()} | ${order.symbol} | ${order.side} | ${order.orderType} | qty: ${order.qty} | price: ${order.price} | status: ${order.orderStatus}`,
    }));
  });

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