CREATE TABLE `social_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('instagram','whatsapp','tiktok','youtube') NOT NULL,
	`url` varchar(500),
	`active` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_links_platform_unique` UNIQUE(`platform`)
);
