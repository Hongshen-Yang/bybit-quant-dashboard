import { bybitClient } from "../client";

type ExecutionListParams = Parameters<typeof bybitClient.getExecutionList>[0];
type ExecutionListResponse = Awaited<ReturnType<typeof bybitClient.getExecutionList>>;

export type ExecutionListItem = NonNullable<
  NonNullable<ExecutionListResponse["result"]>["list"]
>[number];

export type ExecutionListResult = {
  category?: NonNullable<ExecutionListResponse["result"]>["category"];
  items: ExecutionListItem[];
  nextPageCursor?: string;
};

export async function getExecutionList(
  params: ExecutionListParams
): Promise<ExecutionListResult> {
  const response = await bybitClient.getExecutionList(params);

  return {
    category: response.result?.category,
    items: response.result?.list ?? [],
    nextPageCursor: response.result?.nextPageCursor,
  };
}