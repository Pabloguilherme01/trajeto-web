CREATE TABLE `provider_metric_samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('google_maps','tomtom','anp') NOT NULL,
	`operation` varchar(80) NOT NULL,
	`durationMs` int NOT NULL,
	`success` boolean NOT NULL,
	`statusCode` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_metric_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `provider_metric_samples_provider_created_idx` ON `provider_metric_samples` (`provider`,`createdAt`);