CREATE TABLE `user_vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nickname` varchar(80) NOT NULL,
	`brand` varchar(80),
	`model` varchar(120),
	`version` varchar(120),
	`year` int,
	`fuelType` enum('gasoline','ethanol','flex','diesel','gnv','electric','other') NOT NULL DEFAULT 'flex',
	`tankLiters` decimal(6,2),
	`cityKmPerLiter` decimal(6,2),
	`highwayKmPerLiter` decimal(6,2),
	`customKmPerLiter` decimal(6,2),
	`notes` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_vehicles_user_updated_idx` ON `user_vehicles` (`userId`,`updatedAt`);