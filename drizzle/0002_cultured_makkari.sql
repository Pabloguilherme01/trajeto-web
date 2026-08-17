CREATE TABLE `favorite_stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`stationName` varchar(255) NOT NULL,
	`stationAddress` varchar(500) NOT NULL,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(10,7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_stations_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorite_stations_user_place_unique` UNIQUE(`userId`,`placeId`)
);
--> statement-breakpoint
CREATE INDEX `favorite_stations_user_idx` ON `favorite_stations` (`userId`);