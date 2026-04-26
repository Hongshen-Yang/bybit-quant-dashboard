import { getExecutionList } from "@/lib/bybit/execution/get-execution-list";
import { formatUtcDateTime } from "@/lib/time/utc";

type ActivitiesItem = {
  key: string;
  text: string;
};

function parseTimeValue(value?: string): number {
  if (!value) return 0;

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toTimelineLabel(timeMs: number): string {
  if (!timeMs) return "Unknown time";

  return formatUtcDateTime(timeMs);
}

export async function ActivitiesSection() {
  const executionCategories = ["linear", "inverse", "option", "spot"] as const;
  const executionResults = await Promise.allSettled(
    executionCategories.map((category) => getExecutionList({ category, limit: 50 }))
  );

  const items: ActivitiesItem[] = executionResults
    .flatMap((result, index) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      const category = result.value.category ?? executionCategories[index];
      return result.value.items.map((execution, itemIndex) => ({
        key: `${category}-${execution.execId}-${itemIndex}`,
        timeMs: parseTimeValue(execution.execTime),
        text: `${category.toUpperCase()} | ${execution.symbol} | ${execution.side} ${execution.execQty} @ ${execution.execPrice} | fee: ${execution.execFee} ${execution.feeCurrency} | ${toTimelineLabel(parseTimeValue(execution.execTime))}`,
      }));
    })
    .sort((a, b) => b.timeMs - a.timeMs)
    .map((item) => ({ key: item.key, text: item.text }));

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
      </div>
    </section>
  );
}