import { bybitClient } from "../client";

export type SpotTickerItem = {
	symbol: string;
	lastPrice: string;
	usdIndexPrice: string;
};

export type SpotTickersResult = {
	category?: string;
	items: SpotTickerItem[];
};

export async function getSpotTickers(params?: {
	symbol?: string;
	baseCoin?: string;
}): Promise<SpotTickersResult> {
	const response = await bybitClient.getTickers({
		category: "spot",
		...params,
	});

	return {
		category: response.result?.category,
		items: (response.result?.list ?? []) as SpotTickerItem[],
	};
}
