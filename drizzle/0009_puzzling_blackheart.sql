CREATE TABLE `authorized_fuel_stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorization` varchar(32) NOT NULL,
	`legalName` varchar(255) NOT NULL,
	`address` varchar(500) NOT NULL,
	`complement` varchar(255) NOT NULL,
	`neighborhood` varchar(160) NOT NULL,
	`zipCode` varchar(12) NOT NULL,
	`municipality` varchar(120) NOT NULL,
	`state` varchar(2) NOT NULL,
	`brand` varchar(120) NOT NULL,
	`sourceReference` varchar(500) NOT NULL,
	`sourceUpdatedAt` timestamp NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authorized_fuel_stations_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorized_fuel_stations_authorization_unique` UNIQUE(`authorization`)
);
--> statement-breakpoint
CREATE INDEX `authorized_fuel_stations_municipality_state_idx` ON `authorized_fuel_stations` (`municipality`,`state`);