CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`description` text NOT NULL,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`jobId` int NOT NULL,
	`recruiterId` int,
	`recruiterName` varchar(160),
	`status` enum('ACTIVE','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
	`currentStage` enum('Applied','Screening','Shortlisted','Interview','Offer','Hired','Rejected','Withdrawn') NOT NULL DEFAULT 'Applied',
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`source` varchar(80) NOT NULL DEFAULT 'Careers page',
	`notes` text,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`type` enum('Resume','Cover letter','Certificate','Other') NOT NULL DEFAULT 'Resume',
	`fileName` varchar(240) NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidate_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`userId` int,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(80) NOT NULL,
	`lastName` varchar(80) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`location` varchar(160),
	`currentCompany` varchar(160),
	`currentPosition` varchar(160),
	`experienceYears` int NOT NULL DEFAULT 0,
	`education` varchar(200),
	`skills` text,
	`resumeUrl` text,
	`linkedinUrl` text,
	`githubUrl` text,
	`portfolioUrl` text,
	`source` varchar(80) NOT NULL DEFAULT 'Direct',
	`status` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidates_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `interview_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interviewId` int NOT NULL,
	`interviewerId` int,
	`interviewerName` varchar(160),
	`technicalScore` int,
	`communicationScore` int,
	`problemSolvingScore` int,
	`overallScore` int,
	`recommendation` enum('Strong Hire','Hire','Hold','Reject'),
	`comments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `interview_feedback_interviewId_unique` UNIQUE(`interviewId`)
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`candidateId` int NOT NULL,
	`jobId` int NOT NULL,
	`interviewerId` int,
	`interviewerName` varchar(160) NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`duration` int NOT NULL DEFAULT 45,
	`interviewType` enum('Video','Onsite','Phone') NOT NULL DEFAULT 'Video',
	`meetingLink` text,
	`location` varchar(240),
	`status` enum('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`responsibilities` text,
	`requirements` text,
	`skills` text,
	`departmentId` int,
	`location` varchar(160),
	`employmentType` enum('Full-time','Part-time','Contract','Internship') NOT NULL DEFAULT 'Full-time',
	`experienceMin` int NOT NULL DEFAULT 0,
	`experienceMax` int NOT NULL DEFAULT 5,
	`salaryMin` decimal(12,2),
	`salaryMax` decimal(12,2),
	`openings` int NOT NULL DEFAULT 1,
	`hiringManagerId` int,
	`hiringManagerName` varchar(160),
	`status` enum('DRAFT','OPEN','PAUSED','CLOSED') NOT NULL DEFAULT 'DRAFT',
	`applicationDeadline` date,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`entityType` varchar(80),
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','recruiter','hiring_manager','interviewer') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `applications_candidate_idx` ON `applications` (`candidateId`);--> statement-breakpoint
CREATE INDEX `applications_job_idx` ON `applications` (`jobId`);--> statement-breakpoint
CREATE INDEX `applications_stage_idx` ON `applications` (`currentStage`);--> statement-breakpoint
CREATE INDEX `candidates_location_idx` ON `candidates` (`location`);--> statement-breakpoint
CREATE INDEX `candidates_status_idx` ON `candidates` (`status`);--> statement-breakpoint
CREATE INDEX `interviews_scheduled_idx` ON `interviews` (`scheduledAt`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_department_idx` ON `jobs` (`departmentId`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`isRead`);