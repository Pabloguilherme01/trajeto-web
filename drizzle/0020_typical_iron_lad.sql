CREATE TABLE `operational_automation_jobs` (
	`jobKey` varchar(80) NOT NULL,
	`scheduleCronTaskUid` varchar(65) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_automation_jobs_jobKey` PRIMARY KEY(`jobKey`),
	CONSTRAINT `operational_automation_jobs_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
