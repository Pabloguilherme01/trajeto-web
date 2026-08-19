CREATE TABLE `pagination_alert_threshold_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(120) NOT NULL,
	`previousThreshold` int,
	`threshold` int NOT NULL,
	`changedByUserId` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pagination_alert_threshold_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pagination_alert_threshold_history_region_changed_idx` ON `pagination_alert_threshold_history` (`region`,`changedAt`);--> statement-breakpoint
CREATE INDEX `pagination_alert_threshold_history_changed_by_idx` ON `pagination_alert_threshold_history` (`changedByUserId`,`changedAt`);