CREATE TABLE `consent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`purpose` enum('sms_auth','route_alerts','location') NOT NULL,
	`accepted` boolean NOT NULL,
	`phoneDigest` varchar(128),
	`phoneLast4` varchar(4),
	`policyVersion` varchar(32) NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_price_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`stationName` varchar(255) NOT NULL,
	`product` enum('gasoline','ethanol','diesel_s10','diesel_s500','gnv') NOT NULL,
	`price` decimal(8,3) NOT NULL,
	`municipality` varchar(120) NOT NULL,
	`state` varchar(2) NOT NULL,
	`source` enum('anp') NOT NULL DEFAULT 'anp',
	`sourceReference` varchar(500) NOT NULL,
	`collectedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_price_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`routeSearchId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`stationName` varchar(255) NOT NULL,
	`stationAddress` varchar(500) NOT NULL,
	`status` enum('requested','cancelled','completed') NOT NULL DEFAULT 'requested',
	`redemptionCode` varchar(20) NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`fulfilledAt` timestamp,
	CONSTRAINT `redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `redemptions_redemptionCode_unique` UNIQUE(`redemptionCode`)
);
--> statement-breakpoint
CREATE TABLE `route_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`origin` varchar(240) NOT NULL,
	`destination` varchar(240) NOT NULL,
	`originLat` decimal(10,7) NOT NULL,
	`originLng` decimal(10,7) NOT NULL,
	`destinationLat` decimal(10,7) NOT NULL,
	`destinationLng` decimal(10,7) NOT NULL,
	`distanceMeters` int NOT NULL,
	`durationSeconds` int NOT NULL,
	`routeSummary` varchar(255),
	`overviewPolyline` text,
	`locationConsent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `consent_events_captured_at_idx` ON `consent_events` (`capturedAt`);--> statement-breakpoint
CREATE INDEX `consent_events_user_idx` ON `consent_events` (`userId`);--> statement-breakpoint
CREATE INDEX `fuel_price_place_collected_idx` ON `fuel_price_snapshots` (`placeId`,`collectedAt`);--> statement-breakpoint
CREATE INDEX `redemptions_requested_at_idx` ON `redemptions` (`requestedAt`);--> statement-breakpoint
CREATE INDEX `redemptions_route_idx` ON `redemptions` (`routeSearchId`);--> statement-breakpoint
CREATE INDEX `route_searches_created_at_idx` ON `route_searches` (`createdAt`);--> statement-breakpoint
CREATE INDEX `route_searches_user_idx` ON `route_searches` (`userId`);