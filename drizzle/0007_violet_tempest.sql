CREATE TABLE `traffic_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`corridorId` varchar(80) NOT NULL,
	`corridorLabel` varchar(120) NOT NULL,
	`incidentId` varchar(180) NOT NULL,
	`title` varchar(180) NOT NULL,
	`detail` varchar(500) NOT NULL,
	`severity` enum('minor','moderate','major','unknown') NOT NULL DEFAULT 'unknown',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `traffic_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `traffic_notifications_user_corridor_incident_unique` UNIQUE(`userId`,`corridorId`,`incidentId`)
);
--> statement-breakpoint
CREATE INDEX `traffic_notifications_user_issued_idx` ON `traffic_notifications` (`userId`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `traffic_notifications_user_read_idx` ON `traffic_notifications` (`userId`,`readAt`);