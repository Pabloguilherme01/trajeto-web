CREATE TABLE `google_place_id_cache` (
	`placeId` varchar(255) NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `google_place_id_cache_placeId` PRIMARY KEY(`placeId`)
);
--> statement-breakpoint
CREATE INDEX `google_place_id_cache_expires_at_idx` ON `google_place_id_cache` (`expiresAt`);