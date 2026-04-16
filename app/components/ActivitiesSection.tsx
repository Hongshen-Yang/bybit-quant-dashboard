type ActivitiesItem = {
  key: string;
  text: string;
};

type ActivitiesSectionProps = {
  items: ActivitiesItem[];
  nextPageCursor?: string;
};

export function ActivitiesSection({ items, nextPageCursor }: ActivitiesSectionProps) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2>Activities</h2>

      <div
        style={{
          marginTop: 12,
          border: "2px solid #171717",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#f8fafc",
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {items.length === 0 ? (
            <li>No execution activities found.</li>
          ) : (
            items.map((item) => <li key={item.key}>{item.text}</li>)
          )}
        </ul>

        {nextPageCursor ? (
          <p style={{ marginTop: 12, marginBottom: 0 }}>Next cursor: {nextPageCursor}</p>
        ) : null}
      </div>
    </section>
  );
}