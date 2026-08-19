CREATE TABLE `operational_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` varchar(80) NOT NULL,
	`region` varchar(120) NOT NULL,
	`threshold` int NOT NULL,
	`observedCount` int NOT NULL,
	`status` enum('active','acknowledged','resolved') NOT NULL DEFAULT 'active',
	`firstDetectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastDetectedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`acknowledgedByUserId` int,
	`resolvedAt` timestamp,
	`recurrenceCount` int NOT NULL DEFAULT 1,
	`notificationCount` int NOT NULL DEFAULT 0,
	`lastNotifiedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `operational_alerts_type_region_unique` UNIQUE(`alertType`,`region`)
);
--> statement-breakpoint
CREATE INDEX `operational_alerts_status_updated_idx` ON `operational_alerts` (`status`,`updatedAt`);