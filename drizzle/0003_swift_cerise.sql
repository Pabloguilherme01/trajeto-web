CREATE TABLE `product_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event` enum('station_search','map_open','station_compare','route_open','favorite_intent','favorite_saved','account_cta') NOT NULL,
	`region` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `product_events_event_created_idx` ON `product_events` (`event`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_events_region_created_idx` ON `product_events` (`region`,`createdAt`);