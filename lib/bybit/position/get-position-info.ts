import { bybitClient } from "../client";

type PositionInfoParams = Parameters<typeof bybitClient.getPositionInfo>[0];
type PositionInfoResponse = Awaited<ReturnType<typeof bybitClient.getPositionInfo>>;

export type PositionInfoItem = NonNullable<
	NonNullable<PositionInfoResponse["result"]>["list"]
>[number];

export type PositionInfoResult = {
	category?: NonNullable<PositionInfoResponse["result"]>["category"];
	items: PositionInfoItem[];
	nextPageCursor?: string;
};

export async function getPositionInfo(params: PositionInfoParams): Promise<PositionInfoResult> {
	const response = await bybitClient.getPositionInfo(params);

	return {
		category: response.result?.category,
		items: response.result?.list ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
