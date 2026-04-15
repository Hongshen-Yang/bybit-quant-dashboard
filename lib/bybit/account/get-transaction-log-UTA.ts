import { bybitClient } from "../client";
import { type BybitAccountType } from "../types";

type TransactionLogParams = Parameters<typeof bybitClient.getTransactionLog>[0];
type TransactionLogResponse = Awaited<ReturnType<typeof bybitClient.getTransactionLog>>;
export type TransactionLogItem = NonNullable<
	NonNullable<TransactionLogResponse["result"]>["list"]
>[number];

export type TransactionLogResult = {
	items: TransactionLogItem[];
	nextPageCursor?: string;
};

export async function getTransactionLogUTA(params?: TransactionLogParams): Promise<TransactionLogResult> {
	const response = await bybitClient.getTransactionLog({
		...params,
		accountType: (params?.accountType ?? "UNIFIED") as BybitAccountType,
	});

	return {
		items: response.result?.list ?? [],
		nextPageCursor: response.result?.nextPageCursor,
	};
}
