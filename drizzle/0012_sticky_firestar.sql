CREATE TABLE `anp_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataset` enum('authorized_stations','price_references') NOT NULL,
	`status` enum('updated','fallback','failed') NOT NULL,
	`sourceUrl` varchar(500) NOT NULL,
	`attempts` int NOT NULL DEFAULT 1,
	`imported` int NOT NULL DEFAULT 0,
	`message` varchar(1000),
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anp_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `route_searches` ADD `vehicleId` int;--> statement-breakpoint
ALTER TABLE `route_searches` ADD `vehicleNickname` varchar(80);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `selectedFuel` enum('gasoline','ethanol');--> statement-breakpoint
ALTER TABLE `route_searches` ADD `gasolinePrice` decimal(8,3);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `ethanolPrice` decimal(8,3);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `gasolineKmPerLiter` decimal(6,2);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `ethanolKmPerLiter` decimal(6,2);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `estimatedTripCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `route_searches` ADD `estimatedLiters` decimal(8,2);--> statement-breakpoint
CREATE INDEX `anp_sync_runs_dataset_attempted_idx` ON `anp_sync_runs` (`dataset`,`attemptedAt`);