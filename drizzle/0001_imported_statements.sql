CREATE TABLE `imported_statements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issuer` text NOT NULL,
	`account_label` text,
	`filename` text NOT NULL,
	`file_format` text NOT NULL,
	`icloud_path` text,
	`statement_start` text,
	`statement_end` text,
	`transaction_count` integer DEFAULT 0 NOT NULL,
	`imported_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imported_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`statement_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`raw_description` text NOT NULL,
	`category` text,
	`issuer_category` text,
	`fingerprint` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`statement_id`) REFERENCES `imported_statements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imported_transactions_fingerprint_unique` ON `imported_transactions` (`fingerprint`);
--> statement-breakpoint
CREATE INDEX `imported_transactions_date_idx` ON `imported_transactions` (`date`);
--> statement-breakpoint
CREATE INDEX `imported_transactions_statement_idx` ON `imported_transactions` (`statement_id`);
