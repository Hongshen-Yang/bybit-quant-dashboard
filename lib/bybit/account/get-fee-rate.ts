import { bybitClient } from "../client";

type FeeRateParams = Parameters<typeof bybitClient.getFeeRate>[0];
type FeeRateResponse = Awaited<ReturnType<typeof bybitClient.getFeeRate>>;

export type FeeRateItem = NonNullable<NonNullable<FeeRateResponse["result"]>["list"]>[number];

export type FeeRateResult = {
	category?: NonNullable<FeeRateResponse["result"]>["category"];
	items: FeeRateItem[];
	nextPageCursor?: string;
};

export async function getFeeRate(params: FeeRateParams): Promise<FeeRateResult> {
	const response = await bybitClient.getFeeRate(params);

	return {
		category: response.result?.category,
		items: response.result?.list ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
