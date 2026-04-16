{/* Can't get main-sub or sub-sub transfer records with sub account API key */}
type TimelineItem = {
  key: string;
  text: string;
};

type DepositsWithdrawalsSectionProps = {
  items: TimelineItem[];
};

export function DepositsWithdrawalsSection({ items }: DepositsWithdrawalsSectionProps) {
  return (
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
          {items.length === 0 ? (
            <li>No deposits or withdrawals found.</li>
          ) : (
            items.map((item) => <li key={item.key}>{item.text}</li>)
          )}
        </ul>
      </div>
    </section>
  );
}