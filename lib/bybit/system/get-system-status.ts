import { bybitClient } from "../client";

type SystemStatusParams = Parameters<typeof bybitClient.getSystemStatus>[0];
type SystemStatusResponse = Awaited<ReturnType<typeof bybitClient.getSystemStatus>>;

export type SystemStatusItem = NonNullable<NonNullable<SystemStatusResponse["result"]>["list"]>[number];

export type SystemStatusResult = {
  items: SystemStatusItem[];
};

export async function getSystemStatus(
  params?: SystemStatusParams
): Promise<SystemStatusResult> {
  const response = await bybitClient.getSystemStatus(params);

  return {
    items: response.result?.list ?? [],
  };
}