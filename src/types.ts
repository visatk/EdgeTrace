export interface Env {
	TELEGRAM_BOT_TOKEN: string;
	ADMIN_TG_ID: string;
	TRC20_WALLET: string;
	DB: D1Database;
	Sandbox: DurableObjectNamespace;
	SCAN_QUEUE: Queue<ScanJob>;
	REPORTS_BUCKET: R2Bucket;
}

export type ScanJob = {
	type: 'recon' | 'cli';
	tgId: number;
	chatId: number;
	messageId: number;
	scanId: number;
	payload: string;
	isPro: boolean;
};

export interface UserRow {
	tg_id: number;
	username: string;
	tier: 'free' | 'pro';
	credits: number;
	last_reset_at: string;
	created_at: string;
}
