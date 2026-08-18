CREATE TABLE `route_alert_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`corridorId` varchar(80) NOT NULL,
	`corridorLabel` varchar(120) NOT NULL,
	`timeSlot` enum('morning','afternoon','evening','anytime') NOT NULL DEFAULT 'anytime',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `route_alert_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `route_alert_preferences_user_corridor_unique` UNIQUE(`userId`,`corridorId`)
);
--> statement-breakpoint
ALTER TABLE `product_events` MODIFY COLUMN `event` enum('station_search','map_open','station_compare','route_open','favorite_intent','favorite_saved','account_cta','redemption_requested','social_instagram_click','social_whatsapp_click','alert_preference_saved','anp_quality_open') NOT NULL;--> statement-breakpoint
CREATE INDEX `route_alert_preferences_user_idx` ON `route_alert_preferences` (`userId`);