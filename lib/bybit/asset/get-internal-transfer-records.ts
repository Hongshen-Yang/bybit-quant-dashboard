import { bybitClient } from "../client";

type InternalTransferRecordsParams = Parameters<
	typeof bybitClient.getInternalTransferRecords
>[0];
type InternalTransferRecordsResponse = Awaited<
	ReturnType<typeof bybitClient.getInternalTransferRecords>
>;

export type InternalTransferRecordItem = NonNullable<
	NonNullable<InternalTransferRecordsResponse["result"]>["list"]
>[number];

export type InternalTransferRecordsResult = {
	items: InternalTransferRecordItem[];
	nextPageCursor?: string;
};

export async function getInternalTransferRecords(
	params?: InternalTransferRecordsParams
): Promise<InternalTransferRecordsResult> {
	const response = await bybitClient.getInternalTransferRecords(params);

	return {
		items: response.result?.list ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
