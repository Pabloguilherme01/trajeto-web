CREATE TABLE `station_search_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mappedBrand` varchar(120) NOT NULL DEFAULT 'all',
	`hoursStatus` varchar(20) NOT NULL DEFAULT 'all',
	`sortBy` varchar(20) NOT NULL DEFAULT 'distance',
	`anpNeighborhood` varchar(160) NOT NULL DEFAULT 'all',
	`anpBrand` varchar(120) NOT NULL DEFAULT 'all',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `station_search_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `station_search_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `station_search_preferences_user_idx` ON `station_search_preferences` (`userId`);