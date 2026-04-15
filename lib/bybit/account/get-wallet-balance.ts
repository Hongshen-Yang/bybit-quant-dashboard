import { bybitClient } from "../client";
import { type BybitAccountType } from "../types";

type WalletBalanceResponse = Awaited<ReturnType<typeof bybitClient.getWalletBalance>>;
type WalletBalanceAccount = NonNullable<WalletBalanceResponse["result"]>["list"][number];
type WalletBalanceCoin = WalletBalanceAccount["coin"][number];

export type WalletBalanceCoinItem = {
	key: string;
	text: string;
};

export type WalletBalanceRow = {
	accountType: BybitAccountType;
	accountLTV: string;
	totalEquity: string;
	totalWalletBalance: string;
	totalAvailableBalance: string;
	coins: WalletBalanceCoin[];
};

export type WalletBalanceSection = {
	accountType: BybitAccountType;
	count: number;
	items: WalletBalanceCoinItem[];
};

export type WalletBalanceResult = {
	rows: WalletBalanceRow[];
	totalRows: number;
	totalUsdValue: number;
	sections: WalletBalanceSection[];
};

function toCoinDisplayText(coin: WalletBalanceCoin): string {
	return `${coin.coin} - wallet: ${coin.walletBalance} - equity: ${coin.equity} - available: ${coin.availableToWithdraw} - pnl: ${coin.unrealisedPnl}`;
}

export async function getWalletBalance(params: {
	accountType: BybitAccountType;
	coin?: string;
}): Promise<WalletBalanceResult> {
	const response = await bybitClient.getWalletBalance({
		accountType: params.accountType,
		coin: params.coin,
	});

	const rows = (response.result?.list ?? []).map((item) => ({
		accountType: item.accountType as BybitAccountType,
		accountLTV: item.accountLTV,
		totalEquity: item.totalEquity,
		totalWalletBalance: item.totalWalletBalance,
		totalAvailableBalance: item.totalAvailableBalance,
		coins: item.coin,
	}));

	const totalRows = rows.reduce((sum, item) => sum + item.coins.length, 0);
	const totalUsdValue = rows.reduce(
		(sum, item) =>
			sum + item.coins.reduce((coinSum, coin) => coinSum + Number(coin.usdValue || 0), 0),
		0
	);
	const sections = rows.map((row) => ({
		accountType: row.accountType,
		count: row.coins.length,
		items: row.coins.map((coin) => ({
			key: `${row.accountType}-${coin.coin}`,
			text: toCoinDisplayText(coin),
		})),
	}));

	return {
		rows,
		totalRows,
		totalUsdValue,
		sections,
	};
}
