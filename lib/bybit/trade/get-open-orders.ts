import { bybitClient } from "../client";

type OpenOrdersParams = Parameters<typeof bybitClient.getActiveOrders>[0];
type OpenOrdersResponse = Awaited<ReturnType<typeof bybitClient.getActiveOrders>>;

export type OpenOrderItem = NonNullable<NonNullable<OpenOrdersResponse["result"]>["list"]>[number];

export type OpenOrdersResult = {
	category?: NonNullable<OpenOrdersResponse["result"]>["category"];
	items: OpenOrderItem[];
	nextPageCursor?: string;
};

export async function getOpenOrders(params: OpenOrdersParams): Promise<OpenOrdersResult> {
	const response = await bybitClient.getActiveOrders(params);

	return {
		category: response.result?.category,
		items: response.result?.list ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
