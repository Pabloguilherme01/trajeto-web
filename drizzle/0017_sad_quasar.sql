CREATE TABLE `pagination_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(120) NOT NULL,
	`threshold` int NOT NULL DEFAULT 3,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagination_alert_thresholds_id` PRIMARY KEY(`id`),
	CONSTRAINT `pagination_alert_thresholds_region_unique` UNIQUE(`region`)
);
--> statement-breakpoint
ALTER TABLE `station_search_preferences` ADD `resultsPerView` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `station_search_preferences` ADD `economicMode` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `pagination_alert_thresholds_region_idx` ON `pagination_alert_thresholds` (`region`);