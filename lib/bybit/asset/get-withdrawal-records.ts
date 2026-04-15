import { bybitClient } from "../client";

type WithdrawalRecordsParams = Parameters<typeof bybitClient.getWithdrawalRecords>[0];
type WithdrawalRecordsResponse = Awaited<ReturnType<typeof bybitClient.getWithdrawalRecords>>;

export type WithdrawalRecordItem = NonNullable<
	NonNullable<WithdrawalRecordsResponse["result"]>["rows"]
>[number];

export type WithdrawalRecordsResult = {
	items: WithdrawalRecordItem[];
	nextPageCursor?: string;
};

export async function getWithdrawalRecords(
	params?: WithdrawalRecordsParams
): Promise<WithdrawalRecordsResult> {
	const response = await bybitClient.getWithdrawalRecords(params);

	return {
		items: response.result?.rows ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
