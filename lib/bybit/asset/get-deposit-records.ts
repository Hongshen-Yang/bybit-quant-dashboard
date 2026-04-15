import { bybitClient } from "../client";

type DepositRecordsParams = Parameters<typeof bybitClient.getDepositRecords>[0];
type DepositRecordsResponse = Awaited<ReturnType<typeof bybitClient.getDepositRecords>>;

export type DepositRecordItem = NonNullable<
	NonNullable<DepositRecordsResponse["result"]>["rows"]
>[number];

export type DepositRecordsResult = {
	items: DepositRecordItem[];
	nextPageCursor?: string;
};

export async function getDepositRecords(
	params?: DepositRecordsParams
): Promise<DepositRecordsResult> {
	const response = await bybitClient.getDepositRecords(params);

	return {
		items: response.result?.rows ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
